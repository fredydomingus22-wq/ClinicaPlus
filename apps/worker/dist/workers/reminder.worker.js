"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const logger_1 = require("../lib/logger");
const prisma_1 = require("../lib/prisma");
const queues_1 = require("../lib/queues");
const events_1 = require("@clinicaplus/events");
exports.reminderWorker = new bullmq_1.Worker(events_1.JobNames.REMINDER_SCHEDULE, async (job) => {
    const log = logger_1.logger.child({ jobId: job.id, agendamentoId: job.data.agendamentoId });
    log.info('Processing reminder job');
    const ag = await prisma_1.prisma.agendamento.findUnique({
        where: { id: job.data.agendamentoId },
        include: { paciente: true, medico: true, clinica: true },
    });
    if (!ag) {
        log.warn('Agendamento not found — skipping');
        return;
    }
    const inactiveStates = ['CANCELADO', 'CONCLUIDO', 'NAO_COMPARECEU'];
    if (inactiveStates.includes(ag.estado)) {
        log.info({ estado: ag.estado }, 'Agendamento inactive — skipping reminder');
        return;
    }
    if (!ag.paciente.email) {
        log.warn('Paciente has no email — skipping reminder');
        return;
    }
    await queues_1.emailQueue.add('reminder-email', {
        to: ag.paciente.email,
        template: 'reminder',
        data: {
            pacienteNome: ag.paciente.nome,
            medicoNome: ag.medico.nome,
            dataHora: ag.dataHora.toISOString(),
            tipo: job.data.tipo,
            clinicaNome: ag.clinica.nome,
        },
    }, { jobId: `email-reminder-${ag.id}-${job.data.tipo}` });
    log.info('Reminder email queued');
}, {
    connection: redis_1.redis,
    concurrency: 10
});
exports.reminderWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err: err.message }, 'Reminder job failed');
});
