import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
import { emailWorker } from './workers/email.worker';
import { reminderWorker } from './workers/reminder.worker';
import { webhookWorker } from './workers/webhook.worker';
import { reportWorker } from './workers/report.worker';

async function main() {
  logger.info('🚀 ClinicaPlus Worker starting...');

  // The workers are started automatically upon instantiation.
  // We just need to keep the process alive and handle shutdown.

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    
    await Promise.all([
      emailWorker.close(),
      reminderWorker.close(),
      webhookWorker.close(),
      reportWorker.close(),
    ]);

    await redis.quit();
    await prisma.$disconnect();
    
    logger.info('Worker stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('Worker is running and waiting for jobs');
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker failed to start');
  process.exit(1);
});
