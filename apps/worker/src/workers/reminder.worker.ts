import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { emailQueue } from '../lib/queues';
import { ReminderJob, JobNames } from '@clinicaplus/events';

export const reminderWorker = new Worker<ReminderJob>(
  JobNames.REMINDER_SCHEDULE,
  async (job: Job<ReminderJob>) => {
    const log = logger.child({ jobId: job.id, agendamentoId: job.data.agendamentoId });
    log.info('Processing reminder job');

    const ag = await prisma.agendamento.findUnique({
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

    await emailQueue.add(
      'reminder-email',
      {
        to: ag.paciente.email,
        template: 'reminder',
        data: {
          pacienteNome: ag.paciente.nome,
          medicoNome: ag.medico.nome,
          dataHora: ag.dataHora.toISOString(),
          tipo: job.data.tipo,
          clinicaNome: ag.clinica.nome,
        },
      },
      { jobId: `email-reminder-${ag.id}-${job.data.tipo}` }
    );

    log.info('Reminder email queued');
  },
  { 
    connection: redis as any, 
    concurrency: 10
  }
);

reminderWorker.on('failed', (job: Job<ReminderJob> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Reminder job failed');
});
