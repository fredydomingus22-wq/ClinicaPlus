import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { redis } from './redis';
import { EmailJob, ReminderJob, WebhookJob, ReportJob, JobNames } from '@clinicaplus/events';

const connection = redis;

const defaultOptions = {
  connection: connection as Redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3600000,
    },
    removeOnComplete: true,
    removeOnFail: { count: 100 },
  },
};

export const emailQueue = new Queue<EmailJob>(JobNames.EMAIL_SEND, defaultOptions);
export const reminderQueue = new Queue<ReminderJob>(JobNames.REMINDER_SCHEDULE, defaultOptions);
export const webhookQueue = new Queue<WebhookJob>(JobNames.WEBHOOK_TRIGGER, defaultOptions);
export const reportQueue = new Queue<ReportJob>(JobNames.REPORT_GENERATE, defaultOptions);
