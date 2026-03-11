import { Router } from 'express';
import { DashboardStatsQuerySchema, Papel } from '@clinicaplus/types';
import { dashboardService } from '../services/dashboard.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Auth: ADMIN
 */
router.get('/stats',
  requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]),
  async (req, res, next) => {
    try {
      const { periodo } = DashboardStatsQuerySchema.parse(req.query);
      const stats = await dashboardService.getStats(req.clinica.id, periodo);
      return res.json({ success: true, data: stats });
    } catch (err) { return next(err); }
  }
);

/**
 * GET /api/dashboard/medico
 * Auth: MEDICO
 */
router.get('/medico',
  requireRole([Papel.MEDICO]),
  async (req, res, next) => {
    try {
      const stats = await dashboardService.getDashboardMedico(req.user.id, req.clinica.id);
      return res.json({ success: true, data: stats });
    } catch (err) { return next(err); }
  }
);

/**
 * GET /api/dashboard/consultas-por-dia
 * Auth: ADMIN, RECEPCIONISTA
 */
router.get('/consultas-por-dia',
  requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]),
  async (req, res, next) => {
    try {
      const data = await dashboardService.getConsultasPorDia(req.clinica.id);
      return res.json({ success: true, data });
    } catch (err) { return next(err); }
  }
);

export default router;
