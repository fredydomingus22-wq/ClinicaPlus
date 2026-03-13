import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { logger } from '../lib/logger';
import { config } from '../lib/config';
import { systemMetrics } from '../lib/metrics';
import { sendCriticalAlert } from '../lib/alerting';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  if (err instanceof ZodError || err.name === 'ZodError') {
    const zodErr = err as ZodError;
    res.status(400).json({
      success: false,
      error: {
        message: 'Os dados enviados são inválidos ou estão incompletos. Por favor, verifique os campos.',
        code: 'VALIDATION_ERROR',
        details: zodErr.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          message: 'Esta informação já se encontra registada no nosso sistema. Por favor, verifique se está a tentar criar um duplicado.',
          code: 'DUPLICATE_ENTRY',
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          message: 'Não conseguimos encontrar o registo solicitado. Por favor, confirme se os dados estão corretos.',
          code: 'NOT_FOUND',
        },
      });
      return;
    }
  }

  // Structured error logging
  const isInternalError = !res.statusCode || res.statusCode >= 500;
  const isDebug = config.NODE_ENV !== 'production' || process.env['DEBUG'];

  if (isInternalError || isDebug) {
    if (isInternalError) {
      systemMetrics.errors_5xx_total++;
      sendCriticalAlert('Server Error', `${err.message}\n${req.method} ${req.path}\nUser: ${req.user?.id || 'N/A'}\nClinica: ${req.clinica?.id || 'N/A'}`);
    }

    logger.error(
      {
        type: 'error',
        err: {
          message: err.message,
          stack: isInternalError ? err.stack : undefined,
          code: (err as unknown as Record<string, unknown>).code as string || (err as unknown as Record<string, unknown>).name as string || 'UNKNOWN_ERROR',
        },
        request: {
          method: req.method,
          path: req.path,
          userId: req.user?.id,
          clinicaId: req.user?.clinicaId || req.clinica?.id,
        },
      },
      `Error ${res.statusCode || 500}: ${err.message}`
    );
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Lamentamos, mas ocorreu um erro inesperado no sistema. Por favor, tente novamente mais tarde ou contacte o suporte técnico.',
      code: 'INTERNAL_ERROR',
      ...(config.NODE_ENV !== 'production' && { details: err.message }),
    },
  });
}
