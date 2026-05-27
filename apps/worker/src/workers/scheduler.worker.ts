import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

interface SchedulerJobData {
  type: 'check-appointment-reminders' | 'cleanup-expired-jobs';
}

/**
 * Worker para processar jobs do scheduler usando BullMQ repeatable jobs.
 * Substitui o node-cron em process para maior resiliência e distribuição.
 */
export const schedulerWorker = new Worker<SchedulerJobData>(
  'scheduler',
  async (job: Job<SchedulerJobData>) => {
    const { type } = job.data;
    logger.info({ jobId: job.id, type }, 'Processing scheduler job');

    switch (type) {
      case 'check-appointment-reminders':
        await processPendingReminders();
        break;
      case 'cleanup-expired-jobs':
        await cleanupExpiredJobs();
        break;
    }
  },
  { connection: redis, concurrency: 2 }
);

schedulerWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Scheduler job completed');
});

schedulerWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Scheduler job failed');
});

/**
 * Processa lembretes de agendamento pendentes.
 * Lógica migrada do scheduler.service.ts do API.
 */
async function processPendingReminders(): Promise<void> {
  const agora = new Date();
  const em5min = new Date(agora.getTime() + 5 * 60 * 1000);

  const pendentes = await prisma.lembreteAgendamento.findMany({
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

  if (pendentes.length === 0) return;

  logger.info({ count: pendentes.length }, 'Processing pending reminders');

  for (const lembrete of pendentes) {
    const ag = lembrete.agendamento;

    if (['CANCELADO', 'NAO_COMPARECEU'].includes(ag.estado)) {
      await prisma.lembreteAgendamento.update({
        where: { id: lembrete.id },
        data: { enviadoEm: new Date(), sucesso: false, erro: 'Appointment cancelled or no-show' },
      });
      continue;
    }

    if (!ag.paciente.email) {
      await prisma.lembreteAgendamento.update({
        where: { id: lembrete.id },
        data: { enviadoEm: new Date(), sucesso: false, erro: 'Patient has no email' },
      });
      continue;
    }

    try {
      // Enfileirar job de lembrete no reminderQueue
      const { reminderQueue } = await import('../lib/queues');
      await reminderQueue.add(
        lembrete.tipo === 'H24' ? 'reminder-24h' : 'reminder-2h',
        { agendamentoId: ag.id, tipo: lembrete.tipo === 'H24' ? '24h' : '2h' },
        { 
          jobId: `reminder-${lembrete.tipo.toLowerCase()}-${ag.id}`, 
          attempts: 3, 
          backoff: { type: 'exponential', delay: 3600000 } 
        }
      );

      await prisma.lembreteAgendamento.update({
        where: { id: lembrete.id },
        data: { enviadoEm: new Date(), sucesso: true },
      });
    } catch (err) {
      logger.error({ err, lembreteId: lembrete.id }, 'Failed to queue reminder');
    }
  }
}

/**
 * Limpa jobs expirados no BullMQ.
 */
async function cleanupExpiredJobs(): Promise<void> {
  logger.info('Cleaning up expired jobs');
  // Implementar limpeza de jobs expirados se necessário
  // Por enquanto, apenas log
}
