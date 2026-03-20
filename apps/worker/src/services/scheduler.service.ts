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
  /**
   * Starts all scheduled jobs.
   */
  start(): void {
    const timezone = 'Africa/Luanda';

    // 02:00 — Daily subscription maintenance
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily subscription maintenance cycle');
      try {
        await jobVerificarExpiracoes();
        await jobSubscricaoAvisos();
        logger.info('Daily subscription maintenance cycle completed');
      } catch (err) {
        logger.error({ err }, 'Error during daily subscription maintenance cycle');
      }
    }, { timezone });

    // 07:00 — Daily WhatsApp 24h reminders
    cron.schedule('0 7 * * *', async () => {
      logger.info('Starting daily WhatsApp 24h reminders');
      try {
        await jobWaLembretes('24h');
      } catch (err) {
        logger.error({ err }, 'Error in WhatsApp 24h reminders job');
      }
    }, { timezone });

    // Hourly — WhatsApp conversation expiration
    cron.schedule('0 * * * *', async () => {
      logger.info('Starting hourly WhatsApp conversation expiration');
      try {
        await jobWaExpirarConversas();
      } catch (err) {
        logger.error({ err }, 'Error in WhatsApp conversation expiration job');
      }
    }, { timezone });

    // Every 30min — WhatsApp 2h reminders
    cron.schedule('*/30 * * * *', async () => {
      logger.info('Starting WhatsApp 2h reminders');
      try {
        await jobWaLembretes('2h');
      } catch (err) {
        logger.error({ err }, 'Error in WhatsApp 2h reminders job');
      }
    }, { timezone });

    logger.info('Worker scheduler started with all jobs');
  }
};
