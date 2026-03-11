import { Router } from 'express';
import { Papel, EquipaCreateSchema, UtilizadorUpdateSchema, UtilizadorListQuerySchema } from '@clinicaplus/types';
import { equipaService } from '../services/equipa.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

/**
 * All equipa routes require ADMIN role.
 * SuperAdmins might manage them across all clinics but current multitenancy guards restrict requests to a specific `clinicaId`.
 */

/**
 * GET /equipa
 * Lists all non-patient/non-medico staff members for the clinic.
 */
router.get('/',
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      const query = UtilizadorListQuerySchema.parse(req.query);
      const result = await equipaService.list(req.clinica.id, query);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

/**
 * GET /equipa/:id
 * Gets a specific staff member.
 */
router.get('/:id',
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const result = await equipaService.getOne(id, req.clinica.id);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

/**
 * POST /equipa
 * Creates a new staff member and sends email with generated password.
 */
router.post('/',
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      const data = EquipaCreateSchema.parse(req.body);
      const result = await equipaService.create(data, req.clinica.id);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

/**
 * PATCH /equipa/:id
 * Updates staff member details or status.
 */
router.patch('/:id',
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const data = UtilizadorUpdateSchema.parse(req.body);
      const result = await equipaService.update(id, data, req.clinica.id);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

export default router;
