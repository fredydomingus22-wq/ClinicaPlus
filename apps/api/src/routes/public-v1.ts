import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { EscopoApiKey } from '@clinicaplus/types';

const router = Router();

/**
 * Middleware para verificar escopos da API Key.
 */
function requireScope(scope: EscopoApiKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.escopos?.includes(scope as never)) {
      return next(new AppError(`Escopo necessário: ${scope}`, 403, 'INSUFFICIENT_SCOPE'));
    }
    next();
  };
}

/**
 * GET /public/v1/pacientes
 */
router.get('/pacientes', requireScope(EscopoApiKey.READ_PACIENTES), async (req: Request, res: Response): Promise<void> => {
  const pacientes = await prisma.paciente.findMany({
    where: { clinicaId: req.clinica.id, ativo: true },
    select: {
      id: true,
      numeroPaciente: true,
      nome: true,
      dataNascimento: true,
      genero: true,
      telefone: true,
      email: true
    }
  });

  res.json({ success: true, data: pacientes });
});

/**
 * GET /public/v1/agendamentos
 */
router.get('/agendamentos', requireScope(EscopoApiKey.READ_AGENDAMENTOS), async (req: Request, res: Response): Promise<void> => {
  const agendamentos = await prisma.agendamento.findMany({
    where: { clinicaId: req.clinica.id },
    orderBy: { dataHora: 'desc' },
    select: {
      id: true,
      dataHora: true,
      duracao: true,
      tipo: true,
      estado: true,
      paciente: {
        select: { nome: true, numeroPaciente: true }
      },
      medico: {
        select: { nome: true }
      }
    }
  });

  res.json({ success: true, data: agendamentos });
});

export default router;
