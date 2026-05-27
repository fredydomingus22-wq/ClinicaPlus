import pino, { type Logger } from 'pino';
import { config } from './config';

// Only use pino-pretty in local development (not in containerized environments like Railway)
const isLocalDev = config.NODE_ENV === 'development' && !process.env.RAILWAY_ENVIRONMENT && !process.env.CI;
const transport = isLocalDev
  ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
  : undefined;

/**
 * Application logger using pino.
 * Uses pino-pretty in development, structured JSON in production.
 * Redacts sensitive headers automatically.
 */
export const logger: Logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    service: 'clinicaplus-api',
    env: config.NODE_ENV,
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
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(transport ? { transport } : {}),
});

