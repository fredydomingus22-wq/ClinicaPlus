import pino, { type Logger } from 'pino';
import { config } from './config';

// Only use pino-pretty in local development (not in containerized environments like Railway)
const isLocalDev = config.NODE_ENV === 'development' && !process.env.RAILWAY_ENVIRONMENT && !process.env.CI;
const transport = isLocalDev
  ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
  : undefined;

export const logger: Logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    service: 'clinicaplus-worker',
    env: config.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(transport ? { transport } : {}),
});
