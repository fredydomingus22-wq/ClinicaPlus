import pino, { type Logger } from 'pino';
import { config } from './config';

const transport = config.NODE_ENV !== 'production'
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
