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
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      queries: req.query,
      // Scrub sensitive headers
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        cookie: req.headers.cookie ? '[REDACTED]' : undefined,
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      // Scrub sensitive headers
      headers: {
        ...res.getHeaders(),
        'set-cookie': res.getHeaders()['set-cookie'] ? '[REDACTED]' : undefined,
      },
    }),
    err: pino.stdSerializers.err,
  },
  ...(transport && { transport }),
});

