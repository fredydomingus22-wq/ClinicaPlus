import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { ReportJob, JobNames } from '@clinicaplus/events';

export const reportWorker = new Worker<ReportJob>(
  JobNames.REPORT_GENERATE,
  async (job: Job<ReportJob>) => {
    logger.info({ jobId: job.id }, 'Report worker not yet implemented (stub)');
  },
  { connection: redis }
);
