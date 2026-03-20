import pino, { type Logger } from 'pino';
import { config } from './config';

const transport = config.NODE_ENV !== 'production'
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
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(transport ? { transport } : {}),
});

