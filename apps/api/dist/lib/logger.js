"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const config_1 = require("./config");
// Only use pino-pretty in local development (not in containerized environments like Railway)
const isLocalDev = config_1.config.NODE_ENV === 'development' && !process.env.RAILWAY_ENVIRONMENT && !process.env.CI;
const transport = isLocalDev
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined;
/**
 * Application logger using pino.
 * Uses pino-pretty in development, structured JSON in production.
 * Redacts sensitive headers automatically.
 */
exports.logger = (0, pino_1.default)({
    level: config_1.config.NODE_ENV === 'production' ? 'info' : 'debug',
    base: {
        service: 'clinicaplus-api',
        env: config_1.config.NODE_ENV,
    },
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'req.headers["x-api-key"]',
            'req.headers["x-clinicaplus-signature"]'
        ],
        censor: '[REDACTED]',
    },
    serializers: {
        err: pino_1.default.stdSerializers.err,
        error: pino_1.default.stdSerializers.err,
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    ...(transport ? { transport } : {}),
});
