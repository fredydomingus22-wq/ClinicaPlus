import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  // SUPER_ADMIN can bypass tenant checks or impersonate a clinic
  if (req.user?.papel === 'SUPER_ADMIN') {
    const impersonateId = req.headers['x-clinica-id'] as string;
    if (impersonateId) {
      req.user.clinicaId = impersonateId;
    } else {
      // Provide a minimal fallback context to prevent req.clinica.id crashes
      req.clinica = { id: 'system-admin', nome: 'Administração Geral' } as unknown as Request['clinica'];
      return next();
    }
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
