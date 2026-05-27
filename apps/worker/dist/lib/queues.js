"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentExpirationQueue = exports.whatsappQueue = exports.reportQueue = exports.webhookQueue = exports.reminderQueue = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const events_1 = require("@clinicaplus/events");
const defaultOptions = {
    connection: redis_1.redis,
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
exports.emailQueue = new bullmq_1.Queue(events_1.JobNames.EMAIL_SEND, defaultOptions);
exports.reminderQueue = new bullmq_1.Queue(events_1.JobNames.REMINDER_SCHEDULE, defaultOptions);
exports.webhookQueue = new bullmq_1.Queue(events_1.JobNames.WEBHOOK_TRIGGER, defaultOptions);
exports.reportQueue = new bullmq_1.Queue(events_1.JobNames.REPORT_GENERATE, defaultOptions);
exports.whatsappQueue = new bullmq_1.Queue(events_1.JobNames.WHATSAPP_MESSAGE, defaultOptions);
exports.appointmentExpirationQueue = new bullmq_1.Queue(events_1.JobNames.APPOINTMENT_EXPIRATION, defaultOptions);
