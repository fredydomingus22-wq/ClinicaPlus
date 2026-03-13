import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';

/**
 * Access logger middleware using pino-http.
 * Automatically logs all HTTP requests and responses.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'] as string;
    if (existing) return existing;
    const id = randomUUID();
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
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
