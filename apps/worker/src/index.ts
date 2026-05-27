import http from 'http';
import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
import { emailWorker } from './workers/email.worker';
import { reminderWorker } from './workers/reminder.worker';
import { webhookWorker } from './workers/webhook.worker';
import { reportWorker } from './workers/report.worker';
import { reportAgtWorker } from './workers/report-agt.worker';
import { criarSessoesWorker } from './workers/criarSessoes.worker';
import { appointmentExpirationWorker } from './workers/appointment-expiration.worker';
import { tratamentoWorker } from './workers/tratamento.worker';
import { pdfWorker } from './workers/pdf.worker';
import { schedulerWorker } from './workers/scheduler.worker';
import { estoqueMinimoWorker, validadeProximaWorker, analyticsWorker, ESTOQUE_JOB_NAMES } from './workers/estoque.worker';
import { Queue } from 'bullmq';
import { schedulerService } from './services/scheduler.service';

// Queue para jobs recorrentes do scheduler
const schedulerQueue = new Queue('scheduler', { connection: redis });

/**
 * Configura jobs recorrentes do scheduler usando BullMQ.
 * Substitui o node-cron em process para maior resiliência.
 */
async function setupScheduler(): Promise<void> {
  // Lembretes de agendamento (verificar a cada hora)
  await schedulerQueue.add(
    'check-appointment-reminders',
    { type: 'check-appointment-reminders' },
    {
      repeat: { pattern: '0 * * * *' }, // Cada hora
      jobId: 'check-appointment-reminders',
    }
  );

  // Limpeza de jobs expirados (diariamente às 2h)
  await schedulerQueue.add(
    'cleanup-expired-jobs',
    { type: 'cleanup-expired-jobs' },
    {
      repeat: { pattern: '0 2 * * *' }, // 2h da manhã
      jobId: 'cleanup-expired-jobs',
    }
  );

  // Verificação de estoque mínimo (diariamente às 9h)
  await schedulerQueue.add(
    'check-estoque-minimo',
    { type: 'check-estoque-minimo' },
    {
      repeat: { pattern: '0 9 * * *' }, // 9h da manhã
      jobId: 'check-estoque-minimo',
    }
  );

  // Verificação de validade próxima (diariamente às 10h)
  await schedulerQueue.add(
    'check-validade-proxima',
    { type: 'check-validade-proxima' },
    {
      repeat: { pattern: '0 10 * * *' }, // 10h da manhã
      jobId: 'check-validade-proxima',
    }
  );

  logger.info('Scheduler jobs configured with BullMQ');
}

/**
 * Ponto de entrada do ClinicaPlus Worker.
 * Responsável por inicializar todos os workers e garantir o graceful shutdown.
 */
async function main() {
  logger.info('🚀 ClinicaPlus Worker starting...');

  // Servidor HTTP mínimo para healthcheck da infraestrutura (ex: Railway)
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

    schedulerService.stop();

    await Promise.all([
      healthServer.close(),
      emailWorker.close(),
      reminderWorker.close(),
      webhookWorker.close(),
      reportWorker.close(),
      reportAgtWorker.close(),
      criarSessoesWorker.close(),
      appointmentExpirationWorker.close(),
      tratamentoWorker.close(),
      pdfWorker.close(),
      schedulerWorker.close(),
      estoqueMinimoWorker.close(),
      validadeProximaWorker.close(),
      analyticsWorker.close(),
      schedulerQueue.close(),
    ]);

    await redis.quit();
    await prisma.$disconnect();

    logger.info('Worker stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Configurar scheduler com BullMQ (substitui node-cron)
  await setupScheduler();

  // Iniciar scheduler service (node-cron) - mantido para jobs não migrados
  schedulerService.start();

  logger.info('Worker is running and waiting for jobs');
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker failed to start');
  process.exit(1);
});
