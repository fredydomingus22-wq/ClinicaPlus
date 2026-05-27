"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const dashboard_service_1 = require("../services/dashboard.service");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
/**
 * GET /api/dashboard/stats
 * Auth: ADMIN
 */
router.get('/stats', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.RECEPCIONISTA]), async (req, res, next) => {
    try {
        const { periodo } = types_1.DashboardStatsQuerySchema.parse(req.query);
        const stats = await dashboard_service_1.dashboardService.getStats(req.clinica.id, periodo);
        return res.json({ success: true, data: stats });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/dashboard/medico
 * Auth: MEDICO
 */
router.get('/medico', (0, requireRole_1.requireRole)([types_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const stats = await dashboard_service_1.dashboardService.getDashboardMedico(req.user.id, req.clinica.id);
        return res.json({ success: true, data: stats });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/dashboard/consultas-por-dia
 * Auth: ADMIN, RECEPCIONISTA
 */
router.get('/consultas-por-dia', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.RECEPCIONISTA]), async (req, res, next) => {
    try {
        const data = await dashboard_service_1.dashboardService.getConsultasPorDia(req.clinica.id);
        return res.json({ success: true, data });
    }
    catch (err) {
        return next(err);
    }
});
exports.default = router;
