import { Router } from 'express';
import { examesService } from '../services/exames.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// List all for Clinic (Global)
router.get('/', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const filters = {
      estado: req.query.estado as string,
      q: req.query.q as string
    };
    const records = await examesService.listAll(req.clinica!.id, filters);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

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

// Update Exam (Patch)
router.patch('/:id', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const record = await examesService.update(req.clinica!.id, id, req.body);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// Get Signed URL for Upload
router.post('/:id/laudo-upload-url', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { fileName } = req.body;
    const data = await examesService.getLaudoUploadUrl(req.clinica!.id, id, fileName);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Confirm Upload
router.post('/:id/laudo-confirmar', requireRole(['ADMIN', 'MEDICO']), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { path } = req.body;
    const record = await examesService.confirmLaudo(req.clinica!.id, id, path);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
