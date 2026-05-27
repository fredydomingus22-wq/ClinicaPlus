"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const subscricao_expiracao_job_1 = require("../jobs/subscricao-expiracao.job");
const subscricao_avisos_job_1 = require("../jobs/subscricao-avisos.job");
const wa_expirar_conversas_job_1 = require("../jobs/wa-expirar-conversas.job");
const wa_lembrete_job_1 = require("../jobs/wa-lembrete.job");
const logger_1 = require("../lib/logger");
/**
 * Worker Scheduler
 * Manages periodic background maintenance tasks using node-cron.
 */
exports.schedulerService = {
    tasks: [],
    /**
     * Starts all scheduled jobs.
     */
    start() {
        const timezone = 'Africa/Luanda';
        // 02:00 — Daily subscription maintenance
        this.tasks.push(node_cron_1.default.schedule('0 2 * * *', async () => {
            logger_1.logger.info('Starting daily subscription maintenance cycle');
            try {
                await (0, subscricao_expiracao_job_1.jobVerificarExpiracoes)();
                await (0, subscricao_avisos_job_1.jobSubscricaoAvisos)();
                logger_1.logger.info('Daily subscription maintenance cycle completed');
            }
            catch (err) {
                logger_1.logger.error({ err }, 'Error during daily subscription maintenance cycle');
            }
        }, { timezone }));
        // 07:00 — Daily WhatsApp 24h reminders
        this.tasks.push(node_cron_1.default.schedule('0 7 * * *', async () => {
            logger_1.logger.info('Starting daily WhatsApp 24h reminders');
            try {
                await (0, wa_lembrete_job_1.jobWaLembretes)('24h');
            }
            catch (err) {
                logger_1.logger.error({ err }, 'Error in WhatsApp 24h reminders job');
            }
        }, { timezone }));
        // Hourly — WhatsApp conversation expiration
        this.tasks.push(node_cron_1.default.schedule('0 * * * *', async () => {
            logger_1.logger.info('Starting hourly WhatsApp conversation expiration');
            try {
                await (0, wa_expirar_conversas_job_1.jobWaExpirarConversas)();
            }
            catch (err) {
                logger_1.logger.error({ err }, 'Error in WhatsApp conversation expiration job');
            }
        }, { timezone }));
        // Every 30min — WhatsApp 2h reminders
        this.tasks.push(node_cron_1.default.schedule('*/30 * * * *', async () => {
            logger_1.logger.info('Starting WhatsApp 2h reminders');
            try {
                await (0, wa_lembrete_job_1.jobWaLembretes)('2h');
            }
            catch (err) {
                logger_1.logger.error({ err }, 'Error in WhatsApp 2h reminders job');
            }
        }, { timezone }));
        // Every 30min — Appointment Expirations
        this.tasks.push(node_cron_1.default.schedule('*/30 * * * *', async () => {
            logger_1.logger.info('Starting appointment expiration checks');
            try {
                const { appointmentExpirationQueue } = await Promise.resolve().then(() => __importStar(require('../lib/queues')));
                await appointmentExpirationQueue.add('check-overdue', {});
            }
            catch (err) {
                logger_1.logger.error({ err }, 'Error in appointment expiration job trigger');
            }
        }, { timezone }));
        logger_1.logger.info('Worker scheduler started with all jobs');
    },
    /**
     * Stops all scheduled jobs.
     */
    stop() {
        this.tasks.forEach(task => task.stop());
        this.tasks = [];
        logger_1.logger.info('Worker scheduler stopped');
    }
};
