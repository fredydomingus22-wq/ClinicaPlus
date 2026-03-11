import { Router } from 'express';
import { examesService } from '../services/exames.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
  try {
    const records = await examesService.listByPaciente(req.clinica!.id, req.params.pacienteId);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Create request
router.post('/', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const record = await examesService.create(req.clinica!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
