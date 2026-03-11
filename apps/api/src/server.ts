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
import { schedulerService } from './services/scheduler.service';

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

// Security & Core Middlewares
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

// Debug middleware
if (config.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    version: process.env['npm_package_version'] ?? '1.0.0'
  });
});

// Public Routes (no auth required for public sub-paths)
// Note: clinicas.ts handles its own auth per-route (authenticate + requireRole inline)
app.use('/api/auth', authRouter);
app.use('/api/clinicas', clinicasRouter);

// Protected Routes Chain
app.use('/api', authenticate);
app.use('/api/superadmin', superadminRouter); // Before tenantMiddleware as it is cross-tenant
app.use('/api', tenantMiddleware);
app.use('/api', auditLogger);

// Other protected domain routes (all require authenticate + tenantMiddleware above)
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
  app.listen(PORT, () => {
    logger.info(`🚀 ClinicaPlus API running on port ${PORT} in ${config.NODE_ENV} mode`);
    schedulerService.start();
  });
}

export { app };

// Trigger nodemon restart: 2026-03-08
