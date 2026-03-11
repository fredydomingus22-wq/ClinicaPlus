import { Router } from 'express';
import { ReceitaCreateSchema, ReceitaListQuerySchema, Papel } from '@clinicaplus/types';
import { receitasService } from '../services/receitas.service';
import { requireRole } from '../middleware/requireRole';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /receitas
 * Auth: ADMIN, MEDICO
 */
router.get('/',
  requireRole([Papel.ADMIN, Papel.MEDICO]),
  async (req, res, next) => {
    try {
      const query = ReceitaListQuerySchema.parse(req.query);

      // Security: If user is a medico, force filter by their medico profile
      if (req.user.papel === Papel.MEDICO) {
        const medico = await prisma.medico.findUnique({
          where: { utilizadorId: req.user.id }
        });
        if (medico) {
          query.medicoId = medico.id;
        }
      }

      const result = await receitasService.list(req.clinica.id, query);
      return res.json({ success: true, data: result });
    } catch (err) { return next(err); }
  }
);

/**
 * GET /receitas/minhas
 * Auth: PACIENTE
 */
router.get('/minhas',
  requireRole([Papel.PACIENTE]),
  async (req, res, next) => {
    try {
      const result = await receitasService.getMinhas(req.user.id, req.clinica.id);
      return res.json({ success: true, data: result });
    } catch (err) { return next(err); }
  }
);

/**
 * GET /receitas/:id
 * Auth: All roles (Ownership check for PACIENTE)
 */
router.get('/:id',
  requireRole([Papel.ADMIN, Papel.MEDICO, Papel.PACIENTE]),
  async (req, res, next) => {
    try {
      const receta = await receitasService.getOne(req.params.id as string, req.clinica.id);

      // If user is a patient, they can only see their own prescriptions
      if (req.user.papel === Papel.PACIENTE) {
        const paciente = await prisma.paciente.findUnique({
          where: { utilizadorId: req.user.id }
        });
        
        if (!paciente || receta.pacienteId !== paciente.id) {
          return res.status(404).json({
            success: false,
            error: { message: 'Receita não encontrada', code: 'NOT_FOUND' },
          });
        }
      }

      // If user is a medico, ensure they issued it or it belongs to their patient in this clinic
      if (req.user.papel === Papel.MEDICO) {
        const medico = await prisma.medico.findUnique({
          where: { utilizadorId: req.user.id }
        });
        if (medico && receta.medicoId !== medico.id) {
          // Allow access if they are the issuing doctor. In the future maybe allow other doctors in the same clinic?
          // Current rule: only issuing doctor or admin.
          return res.status(403).json({
            success: false,
            error: { message: 'Acesso negado a esta receita', code: 'FORBIDDEN' },
          });
        }
      }

    return res.json({ success: true, data: receta });
  } catch (err) { return next(err); }
});

/**
 * POST /receitas
 * Auth: MEDICO
 */
router.post('/',
  requireRole([Papel.MEDICO]),
  async (req, res, next) => {
    try {
      const body = ReceitaCreateSchema.parse(req.body);
      const receta = await receitasService.create(body, req.clinica.id, req.user.id);
      return res.status(201).json({ success: true, data: receta });
    } catch (err) { return next(err); }
  }
);

export default router;
