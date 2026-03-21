import { Request, Response, NextFunction } from 'express';
import { permissaoService } from '../services/permissao.service';
import { AppError } from '../lib/AppError';

/**
 * Middleware para restringir acesso baseado em permissões granulares.
 */
export function requirePermission(recurso: string, accao: string): (req: Request, _res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AppError('Utilizador não autenticado', 401, 'UNAUTHENTICATED'));
      }

      await permissaoService.requirePermission(req.user.id, recurso, accao);
      next();
    } catch (error) {
      next(error);
    }
  };
}
