import { Router } from 'express';
import { sessoesService } from '../services/sessoes.service';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();

// List by Plano
router.get('/plano/:planoId', requirePermission('tratamento', 'read'), async (req, res, next) => {
  try {
    const records = await sessoesService.listByPlano(req.clinica!.id, req.params.planoId as string);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Update Sessao
router.patch('/:id', requirePermission('sessao', 'update'), async (req, res, next) => {
  try {
    const record = await sessoesService.update(req.clinica!.id, req.params.id as string, req.body);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
