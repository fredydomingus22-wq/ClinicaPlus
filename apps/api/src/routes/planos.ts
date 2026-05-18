import { Router } from 'express';
import { planosService } from '../services/planos.service';
import { requirePermission } from '../middleware/requirePermission';
import { AppError } from '../lib/AppError';
import { Papel } from '@prisma/client';
import { prisma } from '../lib/prisma';

const router = Router();

// List all for Clinic (Global)
router.get('/', requirePermission('tratamento', 'read'), async (req, res, next) => {
  try {
    const filters = {
      estado: req.query.estado as string,
      q: req.query.q as string
    };
    const records = await planosService.listAll(req.clinica!.id, filters);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
  try {
    // Segurança: se for paciente, só pode ver os seus próprios planos
    if (req.user!.papel === Papel.PACIENTE) {
      const paciente = await prisma.paciente.findFirst({
        where: { utilizadorId: req.user!.id }
      });
      if (!paciente || paciente.id !== req.params.pacienteId) {
        throw new AppError('Acesso negado aos dados de outro paciente', 403);
      }
    } else {
      // Outros papéis precisam de permissão de leitura
      await requirePermission('tratamento', 'read')(req, res, () => {});
    }

    const records = await planosService.listByPaciente(req.clinica!.id, req.params.pacienteId);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Get Detail by ID
router.get('/:id', requirePermission('tratamento', 'read'), async (req, res, next) => {
  try {
    const record = await planosService.getById(req.clinica!.id, req.params.id as string);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// Create
router.post('/', requirePermission('tratamento', 'create'), async (req, res, next) => {
  try {
    const record = await planosService.create(req.clinica!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// Update
router.patch('/:id', requirePermission('tratamento', 'update'), async (req, res, next) => {
  try {
    const record = await planosService.update(req.clinica!.id, req.params.id as string, req.body);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
