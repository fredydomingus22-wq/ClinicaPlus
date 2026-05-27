import { Router, Request, Response, NextFunction } from 'express';
import {
  OdontogramaCreateSchema,
  OdontogramaUpdateSchema,
  Papel,
} from '@clinicaplus/types';
import { OdontogramaService } from '../services/odontogramas.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireRole([Papel.ADMIN, Papel.MEDICO]));

router.get('/agendamento/:agendamentoId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const odontograma = await OdontogramaService.getByAgendamento(
      req.clinica!.id,
      req.params.agendamentoId as string,
    );
    res.json(odontograma);
  } catch (err) {
    next(err);
  }
});

router.get('/paciente/:pacienteId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await OdontogramaService.getByPaciente(
      req.clinica!.id,
      req.params.pacienteId as string,
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pacienteId, limit } = req.query;
    const list = await OdontogramaService.list(
      req.clinica!.id,
      pacienteId as string | undefined,
      limit ? parseInt(limit as string) : undefined,
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const odontograma = await OdontogramaService.getById(req.clinica!.id, req.params.id as string);
    res.json(odontograma);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = OdontogramaCreateSchema.parse(req.body);
    const odontograma = await OdontogramaService.create(req.clinica!.id, validated);
    res.status(201).json(odontograma);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = OdontogramaUpdateSchema.parse(req.body);
    const odontograma = await OdontogramaService.update(
      req.clinica!.id,
      req.params.id as string,
      validated,
    );
    res.json(odontograma);
  } catch (err) {
    next(err);
  }
});

export default router;
