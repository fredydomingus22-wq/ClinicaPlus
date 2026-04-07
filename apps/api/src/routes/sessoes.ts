import { Router } from 'express';
import { sessoesService } from '../services/sessoes.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// List by Plano
router.get('/plano/:planoId', async (req, res, next) => {
  try {
    const records = await sessoesService.listByPlano(req.clinica!.id, req.params.planoId);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Update
router.patch('/:id', requireRole(['ADMIN', 'MEDICO', 'RECEPCIONISTA']), async (req, res, next) => {
  try {
    const record = await sessoesService.update(req.clinica!.id, req.params.id as string, req.body);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
