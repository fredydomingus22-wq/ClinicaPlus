import cron from 'node-cron';
import { jobVerificarExpiracoes } from '../jobs/subscricao-expiracao.job';
import { jobSubscricaoAvisos } from '../jobs/subscricao-avisos.job';
import { jobWaExpirarConversas } from '../jobs/wa-expirar-conversas.job';
import { jobWaLembretes } from '../jobs/wa-lembrete.job';
import { logger } from '../lib/logger';

/**
 * Worker Scheduler
 * Manages periodic background maintenance tasks using node-cron.
 */
export const schedulerService = {
  tasks: [] as ReturnType<typeof cron.schedule>[],

  /**
   * Starts all scheduled jobs.
   */
  start(): void {
    const timezone = 'Africa/Luanda';

    // 02:00 — Daily subscription maintenance
    this.tasks.push(cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily subscription maintenance cycle');
      try {
        await jobVerificarExpiracoes();
        await jobSubscricaoAvisos();
        logger.info('Daily subscription maintenance cycle completed');
      } catch (err) {
        logger.error({ err }, 'Error during daily subscription maintenance cycle');
      }
    }, { timezone }));

    // 07:00 — Daily WhatsApp 24h reminders
    this.tasks.push(cron.schedule('0 7 * * *', async () => {
      logger.info('Starting daily WhatsApp 24h reminders');
      try {
        await jobWaLembretes('24h');
      } catch (err) {
        logger.error({ err }, 'Error in WhatsApp 24h reminders job');
      }
    }, { timezone }));

    // Hourly — WhatsApp conversation expiration
    this.tasks.push(cron.schedule('0 * * * *', async () => {
      logger.info('Starting hourly WhatsApp conversation expiration');
      try {
        await jobWaExpirarConversas();
      } catch (err) {
        logger.error({ err }, 'Error in WhatsApp conversation expiration job');
      }
    }, { timezone }));

    // Every 30min — WhatsApp 2h reminders
    this.tasks.push(cron.schedule('*/30 * * * *', async () => {
      logger.info('Starting WhatsApp 2h reminders');
      try {
        await jobWaLembretes('2h');
      } catch (err) {
        logger.error({ err }, 'Error in WhatsApp 2h reminders job');
      }
    }, { timezone }));

    // Every 30min — Appointment Expirations
    this.tasks.push(cron.schedule('*/30 * * * *', async () => {
      logger.info('Starting appointment expiration checks');
      try {
        const { appointmentExpirationQueue } = await import('../lib/queues');
        await appointmentExpirationQueue.add('check-overdue', {});
      } catch (err) {
        logger.error({ err }, 'Error in appointment expiration job trigger');
      }
    }, { timezone }));

    logger.info('Worker scheduler started with all jobs');
  },

  /**
   * Stops all scheduled jobs.
   */
  stop(): void {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    logger.info('Worker scheduler stopped');
  }
};
