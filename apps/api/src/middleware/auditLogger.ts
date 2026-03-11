import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Logs all write operations (POST, PATCH, PUT, DELETE) for auditing.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const writeMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

  // Wrap res.end to capture status code and duration after response is sent
  const originalEnd = res.end;
  
  // @ts-ignore - patching res.end for logging purposes
  res.end = function(chunk: any, encoding: any, callback: any) {
    if (writeMethods.includes(req.method)) {
      const durationMs = Date.now() - start;
      const userId = req.user?.id;
      const clinicaId = req.user?.clinicaId || req.clinica?.id;

      logger.info({
        userId,
        clinicaId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      }, 'Audit log: Write operation');
    }
    
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}
