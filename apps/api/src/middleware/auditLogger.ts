import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Logs all write operations (POST, PATCH, PUT, DELETE) for auditing.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const writeMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

  // Wrap res.end to capture status code and duration after response is sent
  const originalEnd = res.end;
  
  // @ts-expect-error - patching res.end for logging purposes
  res.end = function(chunk: unknown, encoding: string | BufferEncoding, callback?: () => void): Response {
    if (writeMethods.includes(req.method)) {
      const durationMs = Date.now() - start;
      const userId = req.user?.id;
      const clinicaId = req.user?.clinicaId || req.clinica?.id;

      // Extract resource from path (e.g., /api/pacientes -> pacientes)
      const pathParts = req.path.split('/').filter(Boolean);
      const resource = pathParts[1] || 'unknown'; 
      const resourceId = req.params.id;

      logger.info({
        type: 'audit',
        userId,
        clinicaId,
        method: req.method,
        path: req.path,
        resource,
        resourceId,
        statusCode: res.statusCode,
        durationMs,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      }, `Audit: ${req.method} ${resource} by ${userId || 'anonymous'}`);
    }
    
    return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
  };

  next();
}
