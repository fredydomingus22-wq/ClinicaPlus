import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  // SUPER_ADMIN skips tenant checks
  if (req.user?.papel === 'SUPER_ADMIN') {
    return next();
  }

  if (!req.user?.clinicaId) {
    return next(new AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT'));
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { id: req.user.clinicaId },
      include: { configuracao: true },
    });

    if (!clinica) {
      return next(new AppError('Clínica não encontrada', 404, 'CLINICA_NOT_FOUND'));
    }

    if (!clinica.ativo) {
      return next(new AppError('Clínica inativa. Contacte o suporte.', 403, 'CLINICA_INACTIVE'));
    }

    req.clinica = clinica;
    next();
  } catch (err) {
    next(err);
  }
}
