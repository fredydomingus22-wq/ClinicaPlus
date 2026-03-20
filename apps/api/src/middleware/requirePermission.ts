import { Request, Response, NextFunction } from 'express';
import { permissaoService } from '../services/permissao.service';
import { AppError } from '../lib/AppError';

/**
 * Middleware para restringir acesso baseado em permissões granulares.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function requirePermission(recurso: string, accao: string) {
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
