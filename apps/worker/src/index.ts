import http from 'http';
import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
import { emailWorker } from './workers/email.worker';
import { reminderWorker } from './workers/reminder.worker';
import { webhookWorker } from './workers/webhook.worker';
import { reportWorker } from './workers/report.worker';

async function main() {
  logger.info('🚀 ClinicaPlus Worker starting...');

  // Minimal HTTP server for Railway healthcheck
  const port = process.env.PORT || 3000;
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  healthServer.listen(port, () => {
    logger.info({ port }, 'Health healthcheck server running');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    
    healthServer.close();
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
