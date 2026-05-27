"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerWorker = void 0;
const bullmq_1 = require("bullmq");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const redis_1 = require("../lib/redis");
/**
 * Worker para processar jobs do scheduler usando BullMQ repeatable jobs.
 * Substitui o node-cron em process para maior resiliência e distribuição.
 */
exports.schedulerWorker = new bullmq_1.Worker('scheduler', async (job) => {
    const { type } = job.data;
    logger_1.logger.info({ jobId: job.id, type }, 'Processing scheduler job');
    switch (type) {
        case 'check-appointment-reminders':
            await processPendingReminders();
            break;
        case 'cleanup-expired-jobs':
            await cleanupExpiredJobs();
            break;
    }
}, { connection: redis_1.redis, concurrency: 2 });
exports.schedulerWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id }, 'Scheduler job completed');
});
exports.schedulerWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err }, 'Scheduler job failed');
});
/**
 * Processa lembretes de agendamento pendentes.
 * Lógica migrada do scheduler.service.ts do API.
 */
async function processPendingReminders() {
    const agora = new Date();
    const em5min = new Date(agora.getTime() + 5 * 60 * 1000);
    const pendentes = await prisma_1.prisma.lembreteAgendamento.findMany({
        where: {
            enviadoEm: null,
            agendadoPara: {
                gte: agora,
                lte: em5min,
            },
        },
        include: {
            agendamento: {
                include: {
                    paciente: true,
                    medico: true,
                    clinica: true,
                },
            },
        },
        take: 50,
    });
    if (pendentes.length === 0)
        return;
    logger_1.logger.info({ count: pendentes.length }, 'Processing pending reminders');
    for (const lembrete of pendentes) {
        const ag = lembrete.agendamento;
        if (['CANCELADO', 'NAO_COMPARECEU'].includes(ag.estado)) {
            await prisma_1.prisma.lembreteAgendamento.update({
                where: { id: lembrete.id },
                data: { enviadoEm: new Date(), sucesso: false, erro: 'Appointment cancelled or no-show' },
            });
            continue;
        }
        if (!ag.paciente.email) {
            await prisma_1.prisma.lembreteAgendamento.update({
                where: { id: lembrete.id },
                data: { enviadoEm: new Date(), sucesso: false, erro: 'Patient has no email' },
            });
            continue;
        }
        try {
            // Enfileirar job de lembrete no reminderQueue
            const { reminderQueue } = await Promise.resolve().then(() => __importStar(require('../lib/queues')));
            await reminderQueue.add(lembrete.tipo === 'H24' ? 'reminder-24h' : 'reminder-2h', { agendamentoId: ag.id, tipo: lembrete.tipo === 'H24' ? '24h' : '2h' }, {
                jobId: `reminder-${lembrete.tipo.toLowerCase()}-${ag.id}`,
                attempts: 3,
                backoff: { type: 'exponential', delay: 3600000 }
            });
            await prisma_1.prisma.lembreteAgendamento.update({
                where: { id: lembrete.id },
                data: { enviadoEm: new Date(), sucesso: true },
            });
        }
        catch (err) {
            logger_1.logger.error({ err, lembreteId: lembrete.id }, 'Failed to queue reminder');
        }
    }
}
/**
 * Limpa jobs expirados no BullMQ.
 */
async function cleanupExpiredJobs() {
    logger_1.logger.info('Cleaning up expired jobs');
    // Implementar limpeza de jobs expirados se necessário
    // Por enquanto, apenas log
}
