import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';
import { Plano } from '@prisma/client';

const PLAN_ORDER: Record<Plano, number> = { 
  BASICO: 0, 
  PRO: 1, 
  ENTERPRISE: 2 
};

/**
 * Middleware to restrict access based on the clinic's subscription plan.
 * Also enforces read-only access for suspended accounts.
 */
export function requirePlan(minimo: Plano): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // req.clinica is populated by tenantMiddleware
    if (!req.clinica) {
      return next(new AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT'));
    }

    const planoClinica = req.clinica.plano;
    const estado = req.clinica.subscricaoEstado;

    // Suspensa: só leitura (GET) — bloquear tudo o resto
    if (estado === 'SUSPENSA' && req.method !== 'GET') {
      return next(new AppError(
        'Subscrição suspensa. Renova o teu plano para continuar.',
        402,
        'SUBSCRIPTION_SUSPENDED'
      ));
    }

    if (PLAN_ORDER[planoClinica] < PLAN_ORDER[minimo]) {
      return next(new AppError(
        `Esta funcionalidade requer plano ${minimo} ou superior.`,
        402,
        'PLAN_UPGRADE_REQUIRED',
        { planoActual: planoClinica, planoNecessario: minimo }
      ));
    }

    next();
  };
}
