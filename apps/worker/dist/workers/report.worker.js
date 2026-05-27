"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const logger_1 = require("../lib/logger");
const events_1 = require("@clinicaplus/events");
exports.reportWorker = new bullmq_1.Worker(events_1.JobNames.REPORT_GENERATE, async (job) => {
    logger_1.logger.info({ jobId: job.id }, 'Report worker not yet implemented (stub)');
}, { connection: redis_1.redis });
