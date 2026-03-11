import { Router } from 'express';
import { prontuariosService } from '../services/prontuarios.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
  try {
    const records = await prontuariosService.listByPaciente(req.clinica!.id, req.params.pacienteId);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Create entry
router.post('/', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const record = await prontuariosService.create(req.clinica!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// Get one
router.get('/:id', async (req, res, next) => {
  try {
    const record = await prontuariosService.getOne(req.params.id, req.clinica!.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
