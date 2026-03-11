import { Router } from 'express';
import { documentosService } from '../services/documentos.service';

const router = Router();

// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
  try {
    const records = await documentosService.listByPaciente(req.clinica!.id, req.params.pacienteId);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Create reference
router.post('/', async (req, res, next) => {
  try {
    const record = await documentosService.create(req.clinica!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
