import { Router } from 'express';
import { planosService } from '../services/planos.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// List all for Clinic (Global)
router.get('/', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
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
    const records = await planosService.listByPaciente(req.clinica!.id, req.params.pacienteId);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Create
router.post('/', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const record = await planosService.create(req.clinica!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// Update
router.patch('/:id', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const record = await planosService.update(req.clinica!.id, req.params.id as string, req.body);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
