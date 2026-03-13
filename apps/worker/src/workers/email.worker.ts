import { Worker, type Job } from 'bullmq';
import { Resend } from 'resend';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { config } from '../lib/config';
import { EmailJob, JobNames } from '@clinicaplus/events';

const resend = new Resend(config.RESEND_API_KEY);

export const emailWorker = new Worker<EmailJob>(
  JobNames.EMAIL_SEND,
  async (job: Job<EmailJob>) => {
    const log = logger.child({ jobId: job.id, to: job.data.to, template: job.data.template });
    log.info('Processing email job');

    try {
      const { to, template, data } = job.data;
      
      // In a real scenario, we would use a template engine like EJS or React Email.
      // For now, we'll just log and send a simple text.
      const subject = template === 'reminder' ? 'Lembrete de Consulta' : 
                     template === 'registration' ? 'Bem-vindo à ClinicaPlus' : 'Fatura Emitida';

      await resend.emails.send({
        from: 'ClinicaPlus <noreply@clinicaplus.ao>',
        to,
        subject,
        html: `<p>Template: ${template}</p><pre>${JSON.stringify(data, null, 2)}</pre>`,
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
