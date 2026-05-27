"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = void 0;
const bullmq_1 = require("bullmq");
const resend_1 = require("resend");
const redis_1 = require("../lib/redis");
const logger_1 = require("../lib/logger");
const config_1 = require("../lib/config");
const events_1 = require("@clinicaplus/events");
const emailTemplates_1 = require("../lib/emailTemplates");
const resend = new resend_1.Resend(config_1.config.RESEND_API_KEY);
exports.emailWorker = new bullmq_1.Worker(events_1.JobNames.EMAIL_SEND, async (job) => {
    const log = logger_1.logger.child({ jobId: job.id, to: job.data.to, template: job.data.template });
    log.info('Processing email job');
    try {
        const { to, template, data } = job.data;
        const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';
        let subject = 'Notificação ClinicaPlus';
        let html = '';
        if (template === 'reminder') {
            subject = `Lembrete de Consulta — ${data.tipo} — ClinicaPlus`;
            html = emailTemplates_1.emailTemplates.lembrete({
                pacienteNome: data.pacienteNome,
                medicoNome: data.medicoNome,
                clinicaNome: data.clinicaNome,
                dataHora: new Date(data.dataHora),
                horasAntecedencia: data.tipo === '24h' ? 24 : 2,
            });
        }
        else {
            // Fallback or other templates
            subject = template === 'registration' ? 'Bem-vindo à ClinicaPlus' : 'Notificação';
            html = `<p>Template: ${template}</p><pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
        await resend.emails.send({
            from: FROM,
            to,
            subject,
            html,
        });
        log.info('Email sent successfully');
    }
    catch (err) {
        log.error({ err }, 'Failed to send email');
        throw err;
    }
}, {
    connection: redis_1.redis,
    concurrency: 20
});
exports.emailWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err: err.message }, 'Email job failed permanently');
});
