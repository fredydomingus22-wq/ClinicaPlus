// src/middleware/roleGuard.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';

/**
 * Role‑based guard for Anamnese Template endpoints.
 * ADMIN  – full access.
 * MEDICO – can only access templates belonging to their own especialidadeId.
 */
export function withRoleGuard(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user; // populated by authentication middleware
  if (!user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  // ADMIN has unrestricted access
  if (user.papel === 'ADMIN') {
    return next();
  }

  // MEDICO restricted to own specialty
  if (user.papel === 'MEDICO') {
    // When accessing a specific specialty, ensure it matches the user's
    const requestedEspecialidadeId = req.params.especialidadeId || req.body.especialidadeId;
    if (!requestedEspecialidadeId) {
      return next(new AppError('Especialidade não informada', 400));
    }
    if (user.especialidadeId !== requestedEspecialidadeId) {
      return next(new AppError('Acesso negado: médico fora da especialidade', 403));
    }
    return next();
  }

  // unknown role
  return next(new AppError('Papel de usuário desconhecido', 403));
}
