import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { reminderQueue } from '../lib/queues';
import { logger } from '../lib/logger';

/**
 * Robust retry utility for database operations
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  label: string,
  retries = 3
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        logger.warn({ label, attempt: i + 1, err }, `Database operation failed. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Scheduler Service
 * Manages background jobs and appointment reminder logic.
 */
export const schedulerService = {
  task: null as ReturnType<typeof cron.schedule> | null,
  
  /**
   * Initializes the cron jobs.
   */
  start(): void {
    if (this.task) return;

    // Run every 5 minutes
    this.task = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.processPendingReminders();
      } catch (err) {
        logger.error({ err }, 'Scheduler: Error in processPendingReminders cycle');
      }
    });

    logger.info('Reminder scheduler started (every 5 minutes)');
  },

  /**
   * Stops the cron jobs.
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Reminder scheduler stopped');
    }
  },

  /**
   * Fetches and processes pending reminders.
   */
  async processPendingReminders(): Promise<void> {
    // Small defensive delay to prevent rapid connection collisions in pooler environments
    await new Promise(resolve => setTimeout(resolve, 100));

    const agora = new Date();
    const em5min = new Date(agora.getTime() + 5 * 60 * 1000);

    // Find reminders scheduled to be sent now or within the next 5 minutes
    const pendentes = await retryOperation(() => prisma.lembreteAgendamento.findMany({
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
    }), 'fetch-pending-reminders');

    if (pendentes.length === 0) return;

    logger.info({ count: pendentes.length }, 'Processing pending reminders');

    for (const lembrete of pendentes) {
      const ag = lembrete.agendamento;

      // Check if appointment is still valid for reminder
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
          data: { 
            enviadoEm: new Date(), 
            sucesso: true 
          },
        });
      } catch (err) {
        logger.error({ err, lembreteId: lembrete.id }, 'Failed to queue fallback reminder');
      }
    }
  },

  /**
   * Schedules future reminders for a confirmed appointment.
   */
  async scheduleReminders(
    agendamentoId: string,
    clinicaId: string,
    dataHora: Date
  ): Promise<void> {
    try {
      const configClinica = await prisma.configuracaoClinica.findUnique({ 
        where: { clinicaId } 
      });
      
      const lembretes = [];
      const agora = new Date();

      // 24h Reminder
      if (configClinica?.lembrete24h ?? true) {
        const agendadoPara = new Date(dataHora.getTime() - 24 * 60 * 60 * 1000);
        if (agendadoPara > agora) {
          lembretes.push({
            clinicaId,
            agendamentoId,
            tipo: 'H24',
            agendadoPara,
          });
        }
      }

      // 2h Reminder
      if (configClinica?.lembrete2h ?? true) {
        const agendadoPara = new Date(dataHora.getTime() - 2 * 60 * 60 * 1000);
        if (agendadoPara > agora) {
          lembretes.push({
            clinicaId,
            agendamentoId,
            tipo: 'H2',
            agendadoPara,
          });
        }
      }

      if (lembretes.length > 0) {
        await prisma.lembreteAgendamento.createMany({
          data: lembretes,
        });
        logger.info({ agendamentoId, count: lembretes.length }, 'Reminders scheduled');
      }
    } catch (err) {
      logger.error({ err, agendamentoId }, 'Failed to schedule reminders');
    }
  }
};
