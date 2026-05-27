"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const especialidades_service_1 = require("../services/especialidades.service");
const requireRole_1 = require("../middleware/requireRole");
const client_1 = require("@prisma/client");
const logger_1 = require("../lib/logger");
const router = (0, express_1.Router)();
// Gestão (escrita) requer papel ADMIN
const requireAdmin = (0, requireRole_1.requireRole)([client_1.Papel.ADMIN]);
router.get('/', async (req, res, next) => {
    try {
        // Debug log for persistent 400 issues
        logger_1.logger.warn({ path: req.path, query: req.query }, '🔍 GET /api/especialidades listing request');
        const query = types_1.EspecialidadeListQuerySchema.parse(req.query);
        const result = await especialidades_service_1.especialidadesService.list(req.clinica.id, query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const result = await especialidades_service_1.especialidadesService.getOne(req.params.id, req.clinica.id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', requireAdmin, async (req, res, next) => {
    try {
        const data = types_1.EspecialidadeCreateSchema.parse(req.body);
        const result = await especialidades_service_1.especialidadesService.create(data, req.clinica.id);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id', requireAdmin, async (req, res, next) => {
    try {
        const data = types_1.EspecialidadeUpdateSchema.parse(req.body);
        const result = await especialidades_service_1.especialidadesService.update(req.params.id, data, req.clinica.id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
        await especialidades_service_1.especialidadesService.delete(req.params.id, req.clinica.id);
        res.json({ success: true, data: null });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
