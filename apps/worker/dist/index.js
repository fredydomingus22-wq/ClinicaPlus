"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const logger_1 = require("./lib/logger");
const redis_1 = require("./lib/redis");
const prisma_1 = require("./lib/prisma");
const email_worker_1 = require("./workers/email.worker");
const reminder_worker_1 = require("./workers/reminder.worker");
const webhook_worker_1 = require("./workers/webhook.worker");
const report_worker_1 = require("./workers/report.worker");
const report_agt_worker_1 = require("./workers/report-agt.worker");
const criarSessoes_worker_1 = require("./workers/criarSessoes.worker");
const appointment_expiration_worker_1 = require("./workers/appointment-expiration.worker");
const tratamento_worker_1 = require("./workers/tratamento.worker");
const pdf_worker_1 = require("./workers/pdf.worker");
const scheduler_worker_1 = require("./workers/scheduler.worker");
const estoque_worker_1 = require("./workers/estoque.worker");
const bullmq_1 = require("bullmq");
const scheduler_service_1 = require("./services/scheduler.service");
// Queue para jobs recorrentes do scheduler
const schedulerQueue = new bullmq_1.Queue('scheduler', { connection: redis_1.redis });
/**
 * Configura jobs recorrentes do scheduler usando BullMQ.
 * Substitui o node-cron em process para maior resiliência.
 */
async function setupScheduler() {
    // Lembretes de agendamento (verificar a cada hora)
    await schedulerQueue.add('check-appointment-reminders', { type: 'check-appointment-reminders' }, {
        repeat: { pattern: '0 * * * *' }, // Cada hora
        jobId: 'check-appointment-reminders',
    });
    // Limpeza de jobs expirados (diariamente às 2h)
    await schedulerQueue.add('cleanup-expired-jobs', { type: 'cleanup-expired-jobs' }, {
        repeat: { pattern: '0 2 * * *' }, // 2h da manhã
        jobId: 'cleanup-expired-jobs',
    });
    // Verificação de estoque mínimo (diariamente às 9h)
    await schedulerQueue.add('check-estoque-minimo', { type: 'check-estoque-minimo' }, {
        repeat: { pattern: '0 9 * * *' }, // 9h da manhã
        jobId: 'check-estoque-minimo',
    });
    // Verificação de validade próxima (diariamente às 10h)
    await schedulerQueue.add('check-validade-proxima', { type: 'check-validade-proxima' }, {
        repeat: { pattern: '0 10 * * *' }, // 10h da manhã
        jobId: 'check-validade-proxima',
    });
    logger_1.logger.info('Scheduler jobs configured with BullMQ');
}
/**
 * Ponto de entrada do ClinicaPlus Worker.
 * Responsável por inicializar todos os workers e garantir o graceful shutdown.
 */
async function main() {
    logger_1.logger.info('🚀 ClinicaPlus Worker starting...');
    // Servidor HTTP mínimo para healthcheck da infraestrutura (ex: Railway)
    const port = process.env.PORT || 3000;
    const healthServer = http_1.default.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        }
        else {
            res.writeHead(404);
            res.end();
        }
    });
    healthServer.listen(port, () => {
        logger_1.logger.info({ port }, 'Health healthcheck server running');
    });
    const shutdown = async (signal) => {
        logger_1.logger.info({ signal }, 'Shutting down gracefully...');
        scheduler_service_1.schedulerService.stop();
        await Promise.all([
            healthServer.close(),
            email_worker_1.emailWorker.close(),
            reminder_worker_1.reminderWorker.close(),
            webhook_worker_1.webhookWorker.close(),
            report_worker_1.reportWorker.close(),
            report_agt_worker_1.reportAgtWorker.close(),
            criarSessoes_worker_1.criarSessoesWorker.close(),
            appointment_expiration_worker_1.appointmentExpirationWorker.close(),
            tratamento_worker_1.tratamentoWorker.close(),
            pdf_worker_1.pdfWorker.close(),
            scheduler_worker_1.schedulerWorker.close(),
            estoque_worker_1.estoqueMinimoWorker.close(),
            estoque_worker_1.validadeProximaWorker.close(),
            estoque_worker_1.analyticsWorker.close(),
            schedulerQueue.close(),
        ]);
        await redis_1.redis.quit();
        await prisma_1.prisma.$disconnect();
        logger_1.logger.info('Worker stopped');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    // Configurar scheduler com BullMQ (substitui node-cron)
    await setupScheduler();
    // Iniciar scheduler service (node-cron) - mantido para jobs não migrados
    scheduler_service_1.schedulerService.start();
    logger_1.logger.info('Worker is running and waiting for jobs');
}
main().catch((err) => {
    logger_1.logger.fatal({ err }, 'Worker failed to start');
    process.exit(1);
});
