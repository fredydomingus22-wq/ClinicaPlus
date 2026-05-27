"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const crypto_1 = require("crypto");
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("../lib/logger");
/**
 * Access logger middleware using pino-http.
 * Automatically logs all HTTP requests and responses.
 */
exports.requestLogger = (0, pino_http_1.default)({
    logger: logger_1.logger,
    genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        if (existing)
            return existing;
        const id = (0, crypto_1.randomUUID)();
        res.setHeader('X-Request-Id', id);
        return id;
    },
    autoLogging: {
        ignore: (req) => {
            const url = req.url ?? '';
            return url === '/health' || url === '/favicon.ico';
        },
    },
    customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err)
            return 'error';
        if (res.statusCode >= 400)
            return 'warn';
        return 'info';
    },
});
