import { Worker, type Job } from 'bullmq';
import { Resend } from 'resend';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { config } from '../lib/config';
import { EmailJob, JobNames } from '@clinicaplus/events';
import { emailTemplates } from '../lib/emailTemplates';

const resend = new Resend(config.RESEND_API_KEY);

export const emailWorker = new Worker<EmailJob>(
  JobNames.EMAIL_SEND,
  async (job: Job<EmailJob>) => {
    const log = logger.child({ jobId: job.id, to: job.data.to, template: job.data.template });
    log.info('Processing email job');

    try {
      const { to, template, data } = job.data;
      
      const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';
      
      let subject = 'Notificação ClinicaPlus';
      let html = '';

      if (template === 'reminder') {
        subject = `Lembrete de Consulta — ${data.tipo} — ClinicaPlus`;
        html = emailTemplates.lembrete({
          pacienteNome: data.pacienteNome as string,
          medicoNome: data.medicoNome as string,
          clinicaNome: data.clinicaNome as string,
          dataHora: new Date(data.dataHora as string),
          horasAntecedencia: data.tipo === '24h' ? 24 : 2,
        });
      } else {
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
    } catch (err) {
      log.error({ err }, 'Failed to send email');
      throw err;
    }
  },
  { 
    connection: redis as any, 
    concurrency: 20
  }
);

emailWorker.on('failed', (job: Job<EmailJob> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Email job failed permanently');
});
