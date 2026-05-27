"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billing_service_1 = require("../services/billing.service");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
/**
 * GET /api/billing/history
 * Returns the billing history for the current clinic tenant.
 */
router.get('/history', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const history = await billing_service_1.billingService.getBillingHistory(clinicaId);
        res.json({ success: true, data: history });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/billing/subscription
 * Returns the current subscription status for the current clinic tenant.
 */
router.get('/subscription', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const status = await billing_service_1.billingService.getSubscriptionStatus(clinicaId);
        res.json({ success: true, data: status });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
