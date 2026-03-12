import { Router } from 'express';
import {
  MedicoCreateSchema,
  MedicoUpdateSchema,
  MedicoListQuerySchema,
  MedicoSlotQuerySchema,
  MedicoSelfUpdateSchema,
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
 * GET /medicos/:id
 * Auth: All authenticated roles
 */
router.get('/:id', async (req, res, next) => {
  try {
    const medico = await medicosService.getOne(
      req.params.id as string,
      req.clinica.id
    );
    return res.json({ success: true, data: medico });
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
 * GET /medicos/me
 * Auth: MEDICO — returns the logged-in médico's own profile.
 */
router.get('/me',
  requireRole([Papel.MEDICO]),
  async (req, res, next) => {
    try {
      const medico = await medicosService.getByUtilizadorId(req.user!.id, req.clinica.id);
      return res.json({ success: true, data: medico });
    } catch (err) { return next(err); }
  }
);

/**
 * PATCH /medicos/me
 * Auth: MEDICO — the logged-in médico updates their own profile.
 * Only allows editing: telefoneDireto, horario, duracaoConsulta.
 */
router.patch('/me',
  requireRole([Papel.MEDICO]),
  async (req, res, next) => {
    try {
      const medico = await medicosService.getByUtilizadorId(req.user!.id, req.clinica.id);
      const body = MedicoSelfUpdateSchema.parse(req.body);
      const updated = await medicosService.update(medico.id, body, req.clinica.id);
      return res.json({ success: true, data: updated });
    } catch (err) { return next(err); }
  }
);

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
