import { Router } from 'express';
import {
  MedicoCreateSchema,
  MedicoUpdateSchema,
  MedicoListQuerySchema,
  MedicoSlotQuerySchema,
  Papel,
} from '@clinicaplus/types';
import { medicosService } from '../services/medicos.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// All routes are behind authenticate + tenantMiddleware from server.ts.

/**
 * GET /medicos
 * Auth: All authenticated roles
 */
router.get('/', async (req, res, next) => {
  try {
    const query = MedicoListQuerySchema.parse(req.query);
    const medicos = await medicosService.list(req.clinica.id, query);
    return res.json({ success: true, data: medicos });
  } catch (err) { return next(err); }
});

/**
 * GET /medicos/:id/slots?data=YYYY-MM-DD
 * Auth: All authenticated roles
 */
router.get('/:id/slots', async (req, res, next) => {
  try {
    const { data } = MedicoSlotQuerySchema.parse(req.query);
    const slots = await medicosService.getSlots(
      req.params.id as string,
      data,
      req.clinica.id
    );
    return res.json({ success: true, data: { slots } });
  } catch (err) { return next(err); }
});

/**
 * POST /medicos
 * Auth: ADMIN
 */
router.post('/',
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      const body = MedicoCreateSchema.parse(req.body);
      const medico = await medicosService.create(body, req.clinica.id);
      return res.status(201).json({ success: true, data: medico });
    } catch (err) { return next(err); }
  }
);

/**
 * PATCH /medicos/:id
 * Auth: ADMIN
 */
router.patch('/:id',
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      const body = MedicoUpdateSchema.parse(req.body);
      const medico = await medicosService.update(
        req.params.id as string,
        body,
        req.clinica.id
      );
      return res.json({ success: true, data: medico });
    } catch (err) { return next(err); }
  }
);

export default router;
