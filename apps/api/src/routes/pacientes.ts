import { Router } from 'express';
import {
  PacienteCreateSchema,
  PacienteUpdateSchema,
  PacienteListQuerySchema,
  Papel,
} from '@clinicaplus/types';
import { pacientesService } from '../services/pacientes.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// All routes here are already behind `authenticate` + `tenantMiddleware` from server.ts.
// req.user and req.clinica are guaranteed to be set.

/**
 * GET /pacientes
 * Auth: ADMIN, MEDICO, RECEPCIONISTA
 */
router.get('/',
  requireRole([Papel.ADMIN, Papel.MEDICO, Papel.RECEPCIONISTA]),
  async (req, res, next) => {
    try {
      const query = PacienteListQuerySchema.parse(req.query);
      const result = await pacientesService.list(req.clinica.id, query);
      return res.json({ success: true, data: result });
    } catch (err) { return next(err); }
  }
);

/**
 * GET /pacientes/:id
 * Auth: ADMIN, MEDICO, RECEPCIONISTA can get any.
 *       PACIENTE can only get their own.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { papel } = req.user;

    if (papel === Papel.PACIENTE) {
      // PACIENTE may only access their own record
      const paciente = await pacientesService.getOne(req.params.id, req.clinica.id);
      if (paciente.utilizadorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Acesso não permitido', code: 'FORBIDDEN' },
        });
      }
      return res.json({ success: true, data: paciente });
    }

    // ADMIN, MEDICO, RECEPCIONISTA
    const paciente = await pacientesService.getOne(req.params.id, req.clinica.id);
    return res.json({ success: true, data: paciente });
  } catch (err) { return next(err); }
});

/**
 * POST /pacientes
 * Auth: ADMIN, RECEPCIONISTA
 */
router.post('/',
  requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]),
  async (req, res, next) => {
    try {
      const body = PacienteCreateSchema.parse(req.body);
      const paciente = await pacientesService.create(body, req.clinica.id);
      return res.status(201).json({ success: true, data: paciente });
    } catch (err) { return next(err); }
  }
);

router.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { papel, id: userId } = req.user;

    // 1. If PACIENTE, verify ownership
    if (papel === Papel.PACIENTE) {
      const paciente = await pacientesService.getOne(id, req.clinica.id);
      if (paciente.utilizadorId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Acesso não permitido', code: 'FORBIDDEN' },
        });
      }
    } else if (papel !== Papel.ADMIN && papel !== Papel.RECEPCIONISTA) {
      // MEDICO cannot update patients via this route
      return res.status(403).json({
        success: false,
        error: { message: 'Acesso não permitido', code: 'FORBIDDEN' },
      });
    }

    // 2. Validate and Update
    const body = PacienteUpdateSchema.parse(req.body);
    const paciente = await pacientesService.update(id, body, req.clinica.id);
    return res.json({ success: true, data: paciente });
  } catch (err) { return next(err); }
});

export default router;
