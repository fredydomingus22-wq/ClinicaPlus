"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscricao_service_1 = require("../services/subscricao.service");
const requireRole_1 = require("../middleware/requireRole");
const types_1 = require("@clinicaplus/types");
const router = (0, express_1.Router)();
// ─── Rotas da Clínica (ADMIN) ──────────────────────────────────────────
/**
 * GET /api/subscricoes/actual
 * Retorna o plano actual, estado, dias restantes, limites e features da clínica.
 */
router.get('/actual', async (req, res, next) => {
    try {
        const data = await subscricao_service_1.subscricaoService.getActual(req.clinica.id);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/subscricoes/historico
 * Lista todas as subscrições passadas da clínica (ADMIN).
 */
router.get('/historico', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const history = await subscricao_service_1.subscricaoService.historico(req.clinica.id);
        res.json({ success: true, data: history });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/subscricoes/uso
 * Retorna o uso actual vs limites (médicos, consultas, pacientes).
 */
router.get('/uso', async (req, res, next) => {
    try {
        const usage = await subscricao_service_1.subscricaoService.getUso(req.clinica.id);
        res.json({ success: true, data: usage });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
