import { Router } from 'express';
import { billingService } from '../services/billing.service';
import { requireRole } from '../middleware/requireRole';

const router = Router();

/**
 * GET /api/billing/history
 * Returns the billing history for the current clinic tenant.
 */
router.get('/history', 
  requireRole(['ADMIN']),
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id;
      const history = await billingService.getBillingHistory(clinicaId);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
});

/**
 * GET /api/billing/subscription
 * Returns the current subscription status for the current clinic tenant.
 */
router.get('/subscription', 
  requireRole(['ADMIN']),
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id;
      const status = await billingService.getSubscriptionStatus(clinicaId);
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
});

export default router;
