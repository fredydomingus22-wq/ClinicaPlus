import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { WebhookJob, JobNames } from '@clinicaplus/events';

export const webhookWorker = new Worker<WebhookJob>(
  JobNames.WEBHOOK_TRIGGER,
  async (job: Job<WebhookJob>) => {
    logger.info({ jobId: job.id }, 'Webhook worker not yet implemented (stub)');
  },
  { connection: redis }
);
