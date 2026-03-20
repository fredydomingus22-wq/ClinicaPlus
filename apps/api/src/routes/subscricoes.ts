import { Router, Request, Response, NextFunction } from 'express';
import { subscricaoService } from '../services/subscricao.service';
import { requireRole } from '../middleware/requireRole';
import { Papel } from '@clinicaplus/types';

const router = Router();

// ─── Rotas da Clínica (ADMIN) ──────────────────────────────────────────

/**
 * GET /api/subscricoes/actual
 * Retorna o plano actual, estado, dias restantes, limites e features da clínica.
 */
router.get('/actual', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await subscricaoService.getActual(req.clinica.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/subscricoes/historico
 * Lista todas as subscrições passadas da clínica (ADMIN).
 */
router.get('/historico', requireRole([Papel.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await subscricaoService.historico(req.clinica.id);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/subscricoes/uso
 * Retorna o uso actual vs limites (médicos, consultas, pacientes).
 */
router.get('/uso', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usage = await subscricaoService.getUso(req.clinica.id);
    res.json({ success: true, data: usage });
  } catch (err) {
    next(err);
  }
});

export default router;
