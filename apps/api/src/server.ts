import './types/express';
import express from 'express';
import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';
import { tenantMiddleware } from './middleware/tenant';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { auditLogger } from './middleware/auditLogger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { schedulerService } from './services/scheduler.service';
import { createServer } from 'http';
import { setupSocket } from './lib/socket';
import { prisma } from './lib/prisma';
import { redis, redisSub } from './lib/redis';
import { systemMetrics } from './lib/metrics';

// Routes
import authRouter from './routes/auth';
import clinicasRouter from './routes/clinicas';
import pacientesRouter from './routes/pacientes';
import medicosRouter from './routes/medicos';
import agendamentosRouter from './routes/agendamentos';
import receitasRouter from './routes/receitas';
import especialidadesRouter from './routes/especialidades';
import dashboardRouter from './routes/dashboard';
import superadminRouter from './routes/superadmin';
import equipaRouter from './routes/equipa';
import notificacoesRouter from './routes/notificacoes';
import billingRouter from './routes/billing';
import prontuariosRouter from './routes/prontuarios';
import examesRouter from './routes/exames';
import documentosRouter from './routes/documentos';
import { faturasRouter } from './routes/faturas';
import { pagamentosRouter } from './routes/pagamentos';
import { relatoriosRouter } from './routes/relatorios';
import apiKeysRouter from './routes/api-keys';
import webhooksRouter from './routes/webhooks';
import publicV1Router from './routes/public-v1';
import auditLogsRouter from './routes/audit-logs';
import utilizadoresRouter from './routes/utilizadores';
import subscricoesRouter from './routes/subscricoes';
import whatsappRouter from './routes/whatsapp';

const app = express();

// Trust proxy for Railway/Cloud environments (needed for express-rate-limit)
app.set('trust proxy', 1);

// 1. Request logging & metrics (should be before other middlewares)
app.use(requestLogger);
app.use((_req, _res, next) => {
  systemMetrics.requests_total++;
  next();
});

// 2. Security & Core Middlewares
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (server-to-server, Postman, health checks)
    if (!origin) return callback(null, true);

    // Always allow the configured primary frontend URL (e.g. https://clinica-plus-web.vercel.app)
    if (origin === config.FRONTEND_URL) return callback(null, true);

    try {
      const url = new URL(origin);

      // Allow any subdomain of the tenant base domain (wildcard tenant subdomains)
      // e.g. TENANT_BASE_DOMAIN=clinicaplus.ao → accepts https://nutrimacho.clinicaplus.ao
      if (config.TENANT_BASE_DOMAIN) {
        const tenantDomain = config.TENANT_BASE_DOMAIN;
        if (
          url.hostname === tenantDomain ||
          url.hostname.endsWith(`.${tenantDomain}`)
        ) {
          return callback(null, true);
        }
      }

      // For development: also allow any localhost origin (different ports)
      if (config.NODE_ENV === 'development' && url.hostname === 'localhost') {
        return callback(null, true);
      }
    } catch {
      // Invalid URL — fall through to rejection
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(globalRateLimiter);

// 3. Health check (stays before auth)
app.get('/health', async (_req, res) => {
  const startTime = Date.now();
  let dbStatus = 'connected';
  let latencyMs = 0;

  try {
    // Lightweight DB check with 2s timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
    ]);
    latencyMs = Date.now() - startTime;
  } catch (err) {
    dbStatus = 'disconnected';
    logger.error({ err }, 'Health check: Database connection failed');
  }
  
  let redisStatus = 'connected';
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error('Redis PONG failed');
  } catch (err) {
    redisStatus = 'disconnected';
    logger.error({ err }, 'Health check: Redis connection failed');
  }

  const status = (dbStatus === 'connected' && redisStatus === 'connected') ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 207).json({ 
    status, 
    database: dbStatus,
    redis: redisStatus,
    uptime: Math.floor((Date.now() - systemMetrics.startTime) / 1000),
    version: process.env['npm_package_version'] ?? '1.0.0',
    checks: {
      db: { status: dbStatus === 'connected' ? 'ok' : 'error', latencyMs: dbStatus === 'connected' ? latencyMs : undefined },
      redis: { status: redisStatus === 'connected' ? 'ok' : 'error' }
    }
  });
});

// 4. Metrics endpoint (internal only)
app.get('/metrics', (req, res): void => {
  const token = req.headers['x-metrics-token'];
  const expectedToken = config.METRICS_TOKEN;
  
  if (!token || typeof token !== 'string' || !expectedToken) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expectedToken);

    if (tokenBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }
  } catch {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    requests_total: systemMetrics.requests_total,
    errors_5xx_total: systemMetrics.errors_5xx_total,
    uptime_seconds: Math.floor((Date.now() - systemMetrics.startTime) / 1000),
    active_connections: 0 // Placeholder as Prisma doesn't expose this easily without internal state
  });
});

// Public Routes
app.use('/api/auth', authRouter);
app.use('/api/clinicas', clinicasRouter);

// Routes with alternative/internal auth (API Keys, HMAC)
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/public/v1', apiKeyAuth, publicV1Router);

// Protected Routes Chain (JWT)
app.use('/api', authenticate);
app.use('/api/superadmin', superadminRouter); 
app.use('/api', tenantMiddleware);
app.use('/api/subscricoes', subscricoesRouter);
app.use('/api', auditLogger);

// Domain routes
app.use('/api/pacientes', pacientesRouter);
app.use('/api/medicos', medicosRouter);
app.use('/api/agendamentos', agendamentosRouter);
app.use('/api/receitas', receitasRouter);
app.use('/api/especialidades', especialidadesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/equipa', equipaRouter);
app.use('/api/notificacoes', notificacoesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/prontuarios', prontuariosRouter);
app.use('/api/exames', examesRouter);
app.use('/api/documentos', documentosRouter);
app.use('/api/faturas', faturasRouter);
app.use('/api/pagamentos', pagamentosRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/audit-logs', authenticate, tenantMiddleware, auditLogsRouter);
app.use('/api/utilizadores', utilizadoresRouter);
app.use('/api/api-keys', authenticate, tenantMiddleware, apiKeysRouter);
app.use('/api/webhooks', webhooksRouter);

// Global Error Handler
app.use(errorHandler);

const PORT = config.PORT || 3001;
const httpServer = createServer(app);
setupSocket(httpServer);

if (require.main === module) {
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(
      { 
        port: PORT, 
        env: config.NODE_ENV, 
        version: process.env['npm_package_version'] ?? '1.0.0' 
      },
      '🚀 ClinicaPlus API started'
    );
    schedulerService.start();
    
    // Verify Redis connection on startup
    redis.ping()
      .then(() => logger.info('✅ Redis connection verified'))
      .catch((err: unknown) => logger.error({ err }, '❌ Redis connection failed on startup'));
  });
}

// Graceful shutdown
const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, `Received ${signal} — shutting down gracefully`);
  try {
    schedulerService.stop();
    await Promise.all([
      prisma.$disconnect(),
      redis.quit(),
      redisSub.quit()
    ]);
    logger.info('✅ Prisma and Redis disconnected, exiting process');
    process.exit(0);
  } catch (err: unknown) {
    logger.error({ err }, '❌ Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
