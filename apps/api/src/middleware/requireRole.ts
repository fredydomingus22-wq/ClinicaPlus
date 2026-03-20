import { Request, Response, NextFunction } from 'express';
import { Papel } from '@prisma/client';
import { AppError } from '../lib/AppError';

export function requireRole(roles: Papel[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Não autenticado', 401, 'UNAUTHENTICATED'));
    }

    if (!roles.includes(req.user.papel)) {
      return next(
        new AppError(
          `Acesso não permitido para o papel ${req.user.papel}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
