import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { reminderQueue } from '../lib/queues';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

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

const SCHEDULER_TZ = 'Africa/Luanda';

async function runWithRedisLock(opts: {
  key: string;
  ttlMs: number;
  label: string;
  fn: () => Promise<void>;
}): Promise<void> {
  const lockValue = `${process.pid}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  const acquired = await redis.set(opts.key, lockValue, 'PX', opts.ttlMs, 'NX');

  if (acquired !== 'OK') {
    logger.debug({ key: opts.key, label: opts.label }, 'Scheduler: lock não adquirido, a saltar ciclo');
    return;
  }

  try {
    await opts.fn();
  } finally {
    // Libertar lock de forma segura (apenas se o valor for o mesmo)
    try {
      await redis.eval(
        `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
        `,
        1,
        opts.key,
        lockValue
      );
    } catch (err) {
      // Melhor esforço: o TTL vai expirar o lock mesmo se o release falhar
      logger.warn({ err, key: opts.key, label: opts.label }, 'Scheduler: falha ao libertar lock Redis');
    }
  }
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
    this.task = cron.schedule(
      '*/5 * * * *',
      async () => {
        await runWithRedisLock({
          key: 'lock:clinicaplus:api-scheduler:5m',
          ttlMs: 4 * 60 * 1000,
          label: 'api-5m',
          fn: async () => {
            try {
              await this.processPendingReminders();
            } catch (err) {
              logger.error({ err }, 'Scheduler: Error in processPendingReminders cycle');
            }
            try {
              const { contingencySyncService } = await import('./fiscal/ContingencySyncService');
              await contingencySyncService.syncAllPending();
            } catch (err) {
              logger.error({ err }, 'Scheduler: Error in contingencySyncService.syncAllPending cycle');
            }
          },
        });
      },
      { timezone: SCHEDULER_TZ }
    );

    // Monthly audit cleanup (archiving > 2 years) - Run on the 1st of every month at 03:00
    cron.schedule(
      '0 3 1 * *',
      async () => {
        await runWithRedisLock({
          key: 'lock:clinicaplus:api-scheduler:audit-cleanup',
          ttlMs: 60 * 60 * 1000,
          label: 'api-audit-cleanup',
          fn: async () => {
            try {
              const { runAuditCleanup } = await import('./jobs/audit-cleanup.job');
              await runAuditCleanup();
            } catch (err) {
              logger.error({ err }, 'Scheduler: Error in runAuditCleanup cycle');
            }
          },
        });
      },
      { timezone: SCHEDULER_TZ }
    );

    logger.info('Scheduler started (Reminders 5m, WA Expiry 1h, Audit Cleanup 1mo)');
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
  },

  /**
   * Expira conversas de WhatsApp sem interacção há mais de 24 horas.
   */
  async processarConversasExpiradas(): Promise<void> {
    const limite = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const conversasAExpirar = await prisma.waConversa.findMany({
      where: {
        estado: { in: ['AGUARDA_INPUT', 'EM_FLUXO_MARCACAO', 'AGUARDA_CONFIRMACAO'] },
        OR: [
          { ultimaMensagemEm: { lt: limite } },
          { AND: [{ ultimaMensagemEm: null }, { criadoEm: { lt: limite } }] }
        ]
      },
      select: { id: true }
    });

    if (conversasAExpirar.length === 0) return;

    logger.info({ count: conversasAExpirar.length }, 'Expiring inactive WhatsApp conversations');

    await prisma.waConversa.updateMany({
      where: { id: { in: conversasAExpirar.map(c => c.id) } },
      data: {
        estado: 'EXPIRADA',
        etapaFluxo: null
      }
    });
  }
};
