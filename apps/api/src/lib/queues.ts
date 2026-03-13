import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { redis } from './redis';
import { EmailJob, ReminderJob, WebhookJob, ReportJob } from '@clinicaplus/events';

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

export const emailQueue = new Queue<EmailJob>('cp:emails', defaultOptions);
export const reminderQueue = new Queue<ReminderJob>('cp:reminders', defaultOptions);
export const webhookQueue = new Queue<WebhookJob>('cp:webhooks', defaultOptions);
export const reportQueue = new Queue<ReportJob>('cp:reports', defaultOptions);
