"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessoes_service_1 = require("../services/sessoes.service");
const requirePermission_1 = require("../middleware/requirePermission");
const router = (0, express_1.Router)();
// List by Plano
router.get('/plano/:planoId', (0, requirePermission_1.requirePermission)('tratamento', 'read'), async (req, res, next) => {
    try {
        const records = await sessoes_service_1.sessoesService.listByPlano(req.clinica.id, req.params.planoId);
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// Update Sessao
router.patch('/:id', (0, requirePermission_1.requirePermission)('sessao', 'update'), async (req, res, next) => {
    try {
        const record = await sessoes_service_1.sessoesService.update(req.clinica.id, req.params.id, req.body);
        res.json(record);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
