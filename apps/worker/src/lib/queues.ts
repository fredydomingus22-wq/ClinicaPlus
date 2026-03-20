import { Queue } from 'bullmq';
import { redis } from './redis';
import { EmailJob, ReminderJob, WebhookJob, ReportJob, WhatsappMessageJob, JobNames } from '@clinicaplus/events';

const defaultOptions = {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: { count: 100 },
  },
};

export const emailQueue = new Queue<EmailJob>(JobNames.EMAIL_SEND, defaultOptions);
export const reminderQueue = new Queue<ReminderJob>(JobNames.REMINDER_SCHEDULE, defaultOptions);
export const webhookQueue = new Queue<WebhookJob>(JobNames.WEBHOOK_TRIGGER, defaultOptions);
export const reportQueue = new Queue<ReportJob>(JobNames.REPORT_GENERATE, defaultOptions);
export const whatsappQueue = new Queue<WhatsappMessageJob>(JobNames.WHATSAPP_MESSAGE, defaultOptions);
