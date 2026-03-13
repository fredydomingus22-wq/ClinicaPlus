import './types/express';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';
import { tenantMiddleware } from './middleware/tenant';
import { auditLogger } from './middleware/auditLogger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { schedulerService } from './services/scheduler.service';
import { prisma } from './lib/prisma';
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
  origin: config.FRONTEND_URL,
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

  const uptime = Math.floor((Date.now() - systemMetrics.startTime) / 1000);
  const status = dbStatus === 'connected' ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 200).json({ 
    status, 
    timestamp: new Date().toISOString(), 
    version: process.env['npm_package_version'] ?? '1.0.0',
    uptime,
    database: dbStatus,
    checks: {
      db: { status: dbStatus === 'connected' ? 'ok' : 'error', latencyMs: dbStatus === 'connected' ? latencyMs : undefined }
    }
  });
});

// 4. Metrics endpoint (internal only)
app.get('/metrics', (req, res): void => {
  const token = req.headers['x-metrics-token'];
  
  if (token !== config.METRICS_TOKEN) {
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

// Protected Routes Chain
app.use('/api', authenticate);
app.use('/api/superadmin', superadminRouter); 
app.use('/api', tenantMiddleware);
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

// Global Error Handler
app.use(errorHandler);

const PORT = config.PORT || 3001;

if (require.main === module) {
  app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(
      { 
        port: PORT, 
        env: config.NODE_ENV, 
        version: process.env['npm_package_version'] ?? '1.0.0' 
      },
      '🚀 ClinicaPlus API started'
    );
    schedulerService.start();
  });
}

// Graceful shutdown
const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, `Received ${signal} — shutting down gracefully`);
  schedulerService.stop();
  await prisma.$disconnect();
  logger.info('Prisma disconnected, exiting process');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
