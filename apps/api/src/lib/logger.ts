import pino from 'pino';
import { config } from './config';

const transport = config.NODE_ENV !== 'production'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    service: 'clinicaplus-api',
    env: config.NODE_ENV,
  },
  ...(transport && { transport }),
});

