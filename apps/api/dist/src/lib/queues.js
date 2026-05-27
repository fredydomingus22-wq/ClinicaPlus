"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportAgtQueue = exports.tratamentoQueue = exports.reportQueue = exports.webhookQueue = exports.reminderQueue = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const events_1 = require("@clinicaplus/events");
const connection = redis_1.redis;
const defaultOptions = {
    connection: connection,
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
exports.emailQueue = new bullmq_1.Queue(events_1.JobNames.EMAIL_SEND, defaultOptions);
exports.reminderQueue = new bullmq_1.Queue(events_1.JobNames.REMINDER_SCHEDULE, defaultOptions);
exports.webhookQueue = new bullmq_1.Queue(events_1.JobNames.WEBHOOK_TRIGGER, defaultOptions);
exports.reportQueue = new bullmq_1.Queue(events_1.JobNames.REPORT_GENERATE, defaultOptions);
exports.tratamentoQueue = new bullmq_1.Queue(events_1.JobNames.TRATAMENTO_GERAR_SESSOES, defaultOptions);
exports.reportAgtQueue = new bullmq_1.Queue(events_1.JobNames.REPORT_AGT, defaultOptions);
