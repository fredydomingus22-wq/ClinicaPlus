import { Router } from 'express';
import { 
  EspecialidadeCreateSchema, 
  EspecialidadeUpdateSchema, 
  EspecialidadeListQuerySchema 
} from '@clinicaplus/types';
import { especialidadesService } from '../services/especialidades.service';
import { requireRole } from '../middleware/requireRole';
import { Papel } from '@prisma/client';
import { logger } from '../lib/logger';

const router = Router();

// Gestão (escrita) requer papel ADMIN
const requireAdmin = requireRole([Papel.ADMIN]);

router.get('/', async (req, res, next) => {
  try {
    // Debug log for persistent 400 issues
    logger.warn({ path: req.path, query: req.query }, '🔍 GET /api/especialidades listing request');
    const query = EspecialidadeListQuerySchema.parse(req.query);
    const result = await especialidadesService.list(req.clinica.id, query);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await especialidadesService.getOne(req.params.id as string, req.clinica.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const data = EspecialidadeCreateSchema.parse(req.body);
    const result = await especialidadesService.create(data, req.clinica.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const data = EspecialidadeUpdateSchema.parse(req.body);
    const result = await especialidadesService.update(req.params.id as string, data, req.clinica.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await especialidadesService.delete(req.params.id as string, req.clinica.id);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

export default router;
