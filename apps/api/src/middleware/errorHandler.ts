import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { logger } from '../lib/logger';
import { config } from '../lib/config';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  if (err instanceof ZodError || err.name === 'ZodError') {
    const zodErr = err as ZodError;
    return res.status(400).json({
      success: false,
      error: {
        message: 'Erro de validação',
        code: 'VALIDATION_ERROR',
        details: zodErr.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Registo já existe',
          code: 'DUPLICATE_ENTRY',
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Não encontrado',
          code: 'NOT_FOUND',
        },
      });
    }
  }

  logger.error(
    {
      err: {
        message: err.message,
        stack: config.NODE_ENV === 'production' ? undefined : err.stack,
      },
      path: req.path,
      method: req.method,
    },
    'Unhandled error'
  );

  return res.status(500).json({
    success: false,
    error: {
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      ...(config.NODE_ENV !== 'production' && { details: err.message }),
    },
  });
}
