import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';

/**
 * Access logger middleware using pino-http.
 * Automatically logs all HTTP requests and responses.
 */
export const requestLogger = pinoHttp({
  logger,
  // Custom logic to skip logging for specific paths
  autoLogging: {
    ignore: (req) => {
      const url = req.url || '';
      return url === '/health' || url === '/favicon.ico';
    },
  },
  // Custom request id generator if needed
  genReqId: (req) => req.headers['x-request-id'] || Math.random().toString(36).substring(2, 11),
  
  // Custom success/error messages
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed with error: ${err.message}`,
  
  // Custom level based on status code
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
