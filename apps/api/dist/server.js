"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("./types/express");
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = require("./lib/config");
const logger_1 = require("./lib/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const authenticate_1 = require("./middleware/authenticate");
const tenant_1 = require("./middleware/tenant");
const apiKeyAuth_1 = require("./middleware/apiKeyAuth");
const auditLogger_1 = require("./middleware/auditLogger");
const rateLimiter_1 = require("./middleware/rateLimiter");
const requestLogger_1 = require("./middleware/requestLogger");
const http_1 = require("http");
const socket_1 = require("./lib/socket");
const prisma_1 = require("./lib/prisma");
const redis_1 = require("./lib/redis");
const metrics_1 = require("./lib/metrics");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const clinicas_1 = __importDefault(require("./routes/clinicas"));
const pacientes_1 = __importDefault(require("./routes/pacientes"));
const medicos_1 = __importDefault(require("./routes/medicos"));
const agendamentos_1 = __importDefault(require("./routes/agendamentos"));
const receitas_1 = __importDefault(require("./routes/receitas"));
const especialidades_1 = __importDefault(require("./routes/especialidades"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const superadmin_1 = __importDefault(require("./routes/superadmin"));
const equipa_1 = __importDefault(require("./routes/equipa"));
const notificacoes_1 = __importDefault(require("./routes/notificacoes"));
const billing_1 = __importDefault(require("./routes/billing"));
const prontuarios_1 = __importDefault(require("./routes/prontuarios"));
const exames_1 = __importDefault(require("./routes/exames"));
const documentos_1 = __importDefault(require("./routes/documentos"));
const faturas_1 = require("./routes/faturas");
const pagamentos_1 = require("./routes/pagamentos");
const relatorios_1 = require("./routes/relatorios");
const api_keys_1 = __importDefault(require("./routes/api-keys"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const public_v1_1 = __importDefault(require("./routes/public-v1"));
const audit_logs_1 = __importDefault(require("./routes/audit-logs"));
const utilizadores_1 = __importDefault(require("./routes/utilizadores"));
const subscricoes_1 = __importDefault(require("./routes/subscricoes"));
const whatsapp_1 = __importDefault(require("./routes/whatsapp"));
const typebot_1 = __importDefault(require("./routes/typebot"));
const bots_1 = require("./routes/bots");
const config_tratamentos_routes_1 = __importDefault(require("./routes/config-tratamentos.routes"));
const planos_1 = __importDefault(require("./routes/planos"));
const sessoes_1 = __importDefault(require("./routes/sessoes"));
const fiscal_1 = __importDefault(require("./routes/fiscal"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const anamneses_1 = __importDefault(require("./routes/anamneses"));
const anamneseTemplates_1 = __importDefault(require("./routes/anamneseTemplates"));
const odontogramas_1 = __importDefault(require("./routes/odontogramas"));
const seguros_1 = require("./routes/seguros");
const contracts_1 = __importDefault(require("./routes/contracts"));
const pdf_1 = __importDefault(require("./routes/pdf"));
// Workers (BullMQ)
require("./workers/tratamento.worker");
const app = (0, express_1.default)();
exports.app = app;
// Trust proxy for Railway/Cloud environments (needed for express-rate-limit)
app.set('trust proxy', 1);
// 1. Request logging & metrics (should be before other middlewares)
app.use(requestLogger_1.requestLogger);
app.use((_req, _res, next) => {
    metrics_1.systemMetrics.requests_total++;
    next();
});
// 2. Security & Core Middlewares
app.use((0, helmet_1.default)({
    contentSecurityPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, Postman, health checks)
        if (!origin)
            return callback(null, true);
        // Always allow the configured primary frontend URL (e.g. https://clinica-plus-web.vercel.app)
        if (origin === config_1.config.FRONTEND_URL)
            return callback(null, true);
        try {
            const url = new URL(origin);
            // Allow any subdomain of the tenant base domain (wildcard tenant subdomains)
            // e.g. TENANT_BASE_DOMAIN=clinicaplus.ao → accepts https://nutrimacho.clinicaplus.ao
            if (config_1.config.TENANT_BASE_DOMAIN) {
                const tenantDomain = config_1.config.TENANT_BASE_DOMAIN;
                if (url.hostname === tenantDomain ||
                    url.hostname.endsWith(`.${tenantDomain}`)) {
                    return callback(null, true);
                }
            }
            // For development: also allow any localhost origin (different ports)
            if (config_1.config.NODE_ENV === 'development' && url.hostname === 'localhost') {
                return callback(null, true);
            }
        }
        catch {
            // Invalid URL — fall through to rejection
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(rateLimiter_1.globalRateLimiter);
// 3. Health check (stays before auth)
app.get('/health', async (_req, res) => {
    const startTime = Date.now();
    let dbStatus = 'connected';
    let latencyMs = 0;
    try {
        // Lightweight DB check with 2s timeout
        await Promise.race([
            prisma_1.prisma.$queryRaw `SELECT 1`,
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
        ]);
        latencyMs = Date.now() - startTime;
    }
    catch (err) {
        dbStatus = 'disconnected';
        logger_1.logger.error({ err }, 'Health check: Database connection failed');
    }
    let redisStatus = 'connected';
    try {
        // Redis check with 2s timeout
        await Promise.race([
            redis_1.redis.ping().then(pong => { if (pong !== 'PONG')
                throw new Error('Redis PONG failed'); }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), 2000))
        ]);
    }
    catch (err) {
        redisStatus = 'disconnected';
        logger_1.logger.error({ err }, 'Health check: Redis connection failed');
    }
    // Check workers status via Redis
    let workersStatus = 'unknown';
    try {
        const workerKeys = await redis_1.redis.keys('bull:*:waiting');
        workersStatus = workerKeys.length > 0 ? 'active' : 'idle';
    }
    catch (err) {
        workersStatus = 'error';
        logger_1.logger.error({ err }, 'Health check: Workers status check failed');
    }
    const status = (dbStatus === 'connected' && redisStatus === 'connected') ? 'ok' : 'degraded';
    res.status(status === 'ok' ? 200 : 207).json({
        status,
        database: dbStatus,
        redis: redisStatus,
        workers: workersStatus,
        uptime: Math.floor((Date.now() - metrics_1.systemMetrics.startTime) / 1000),
        version: process.env['npm_package_version'] ?? '1.0.0',
        checks: {
            db: { status: dbStatus === 'connected' ? 'ok' : 'error', latencyMs: dbStatus === 'connected' ? latencyMs : undefined },
            redis: { status: redisStatus === 'connected' ? 'ok' : 'error' },
            workers: { status: workersStatus === 'active' ? 'ok' : workersStatus === 'idle' ? 'ok' : 'error' }
        }
    });
});
// 4. Metrics endpoint (internal only)
app.get('/metrics', (req, res) => {
    const token = req.headers['x-metrics-token'];
    const expectedToken = config_1.config.METRICS_TOKEN;
    if (!token || typeof token !== 'string' || !expectedToken) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const tokenBuffer = Buffer.from(token);
        const expectedBuffer = Buffer.from(expectedToken);
        if (tokenBuffer.length !== expectedBuffer.length || !crypto_1.default.timingSafeEqual(tokenBuffer, expectedBuffer)) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
    }
    catch {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }
    res.json({
        requests_total: metrics_1.systemMetrics.requests_total,
        errors_5xx_total: metrics_1.systemMetrics.errors_5xx_total,
        uptime_seconds: Math.floor((Date.now() - metrics_1.systemMetrics.startTime) / 1000),
        active_connections: 0 // Placeholder as Prisma doesn't expose this easily without internal state
    });
});
// Public Routes
app.use('/api/auth', auth_1.default);
app.use('/api/clinicas', clinicas_1.default);
// Routes with alternative/internal auth (API Keys, HMAC)
app.use('/api/whatsapp', whatsapp_1.default);
app.use('/api/typebot', typebot_1.default);
app.use('/api/public/v1', apiKeyAuth_1.apiKeyAuth, public_v1_1.default);
// Protected Routes Chain (JWT)
app.use('/api', authenticate_1.authenticate);
app.use('/api/superadmin', superadmin_1.default);
app.use('/api', tenant_1.tenantMiddleware);
app.use('/api/subscricoes', subscricoes_1.default);
app.use('/api', auditLogger_1.auditLogger);
// Domain routes
app.use('/api/pacientes', pacientes_1.default);
app.use('/api/medicos', medicos_1.default);
app.use('/api/agendamentos', agendamentos_1.default);
app.use('/api/receitas', receitas_1.default);
app.use('/api/especialidades', especialidades_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/equipa', equipa_1.default);
app.use('/api/notificacoes', notificacoes_1.default);
app.use('/api/billing', billing_1.default);
app.use('/api/prontuarios', prontuarios_1.default);
app.use('/api/exames', exames_1.default);
app.use('/api/documentos', documentos_1.default);
app.use('/api/faturas', faturas_1.faturasRouter);
app.use('/api/pagamentos', pagamentos_1.pagamentosRouter);
app.use('/api/seguros', seguros_1.segurosRouter);
app.use('/api/relatorios', relatorios_1.relatoriosRouter);
app.use('/api/audit-logs', authenticate_1.authenticate, tenant_1.tenantMiddleware, audit_logs_1.default);
app.use('/api/utilizadores', utilizadores_1.default);
app.use('/api/api-keys', authenticate_1.authenticate, tenant_1.tenantMiddleware, api_keys_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/bots', bots_1.botIntegracaoRouter);
app.use('/api/config-tratamentos', config_tratamentos_routes_1.default);
app.use('/api/planos', planos_1.default);
app.use('/api/sessoes', sessoes_1.default);
app.use('/api/fiscal', fiscal_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/anamneses', anamneses_1.default);
app.use('/api/anamneseTemplates', anamneseTemplates_1.default);
app.use('/api/odontogramas', odontogramas_1.default);
app.use('/api/contracts', contracts_1.default);
app.use('/api/pdf', pdf_1.default);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
const PORT = config_1.config.PORT || 3001;
const httpServer = (0, http_1.createServer)(app);
(0, socket_1.setupSocket)(httpServer);
if (require.main === module) {
    httpServer.listen(Number(PORT), '0.0.0.0', () => {
        logger_1.logger.info({
            port: PORT,
            env: config_1.config.NODE_ENV,
            version: process.env['npm_package_version'] ?? '1.0.0'
        }, '🚀 ClinicaPlus API started');
        // Verify Redis connection on startup
        redis_1.redis.ping()
            .then(() => {
            logger_1.logger.info('✅ Redis connection verified');
            logger_1.logger.info('👷 Treatment Worker initialized and listening');
        })
            .catch((err) => logger_1.logger.error({ err }, '❌ Redis connection failed on startup'));
    });
}
// Graceful shutdown
const shutdown = async (signal) => {
    logger_1.logger.info({ signal }, `Received ${signal} — shutting down gracefully`);
    try {
        // Close HTTP server (stop accepting new connections)
        httpServer.close((err) => {
            if (err) {
                logger_1.logger.error({ err }, 'Error closing HTTP server');
            }
        });
        // Close Socket.io (disconnect all clients)
        if (socket_1.io) {
            await socket_1.io.close();
            logger_1.logger.info('✅ Socket.io closed');
        }
        await Promise.all([
            prisma_1.prisma.$disconnect(),
            redis_1.redis.quit(),
            redis_1.redisSub.quit()
        ]);
        logger_1.logger.info('✅ Prisma and Redis disconnected, exiting process');
        process.exit(0);
    }
    catch (err) {
        logger_1.logger.error({ err }, '❌ Error during shutdown');
        process.exit(1);
    }
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
