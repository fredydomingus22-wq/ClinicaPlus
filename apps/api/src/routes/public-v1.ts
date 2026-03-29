import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { EscopoApiKey, PacienteCreateSchema, AgendamentoCreateSchema, ReceitaListQuerySchema } from '@clinicaplus/types';
import { pacientesService } from '../services/pacientes.service';
import { agendamentosService } from '../services/agendamentos.service';
import { receitasService } from '../services/receitas.service';

const router = Router();

/**
 * Middleware para verificar escopos da API Key.
 */
function requireScope(scope: EscopoApiKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scopes = (req as any).apiScopes || [];
    if (!scopes.includes(scope)) {
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
 * POST /public/v1/pacientes
 */
router.post('/pacientes', requireScope(EscopoApiKey.WRITE_PACIENTES), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = PacienteCreateSchema.parse(req.body);
    const paciente = await pacientesService.create(data, req.clinica.id);
    res.status(201).json({ success: true, data: paciente });
  } catch (err) { next(err); }
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

/**
 * POST /public/v1/agendamentos
 */
router.post('/agendamentos', requireScope(EscopoApiKey.WRITE_AGENDAMENTOS), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = AgendamentoCreateSchema.parse(req.body);
    const agendamento = await agendamentosService.create(data, req.clinica.id);
    res.status(201).json({ success: true, data: agendamento });
  } catch (err) { next(err); }
});

/**
 * GET /public/v1/receitas
 */
router.get('/receitas', requireScope(EscopoApiKey.READ_RECEITAS), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = ReceitaListQuerySchema.parse(req.query);
    const result = await receitasService.list(req.clinica.id, query);
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err) { next(err); }
});

export default router;
