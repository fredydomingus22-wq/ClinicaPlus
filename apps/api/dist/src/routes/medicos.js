"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const medicos_service_1 = require("../services/medicos.service");
const requireRole_1 = require("../middleware/requireRole");
const client_1 = require("@prisma/client");
const logger_1 = require("../lib/logger");
const router = (0, express_1.Router)();
// All routes are behind authenticate + tenantMiddleware from server.ts.
/**
 * GET /medicos
 * Auth: All authenticated roles
 */
router.get('/', async (req, res, next) => {
    try {
        // Debug log for persistent 400 issues
        logger_1.logger.warn({
            path: req.path,
            query: req.query,
            user: req.user?.id,
            clinica: req.clinica?.id
        }, '🔍 GET /api/medicos listing request');
        const query = types_1.MedicoListQuerySchema.parse(req.query);
        const result = await medicos_service_1.medicosService.list(req.clinica.id, query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /medicos/me
 * Auth: MEDICO — returns the logged-in médico's own profile.
 */
router.get('/me', (0, requireRole_1.requireRole)([client_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const medico = await medicos_service_1.medicosService.getByUtilizadorId(req.user.id, req.clinica.id);
        return res.json({ success: true, data: medico });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /medicos/me
 * Auth: MEDICO — the logged-in médico updates their own profile.
 * Only allows editing: telefoneDireto, horario, duracaoConsulta.
 */
router.patch('/me', (0, requireRole_1.requireRole)([client_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const medico = await medicos_service_1.medicosService.getByUtilizadorId(req.user.id, req.clinica.id);
        const body = types_1.MedicoSelfUpdateSchema.parse(req.body);
        const updated = await medicos_service_1.medicosService.update(medico.id, body, req.clinica.id);
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /medicos/:id
 * Auth: All authenticated roles
 */
router.get('/:id', async (req, res, next) => {
    try {
        const medico = await medicos_service_1.medicosService.getOne(req.params.id, req.clinica.id);
        return res.json({ success: true, data: medico });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /medicos/:id/slots?data=YYYY-MM-DD
 * Auth: All authenticated roles
 */
router.get('/:id/slots', async (req, res, next) => {
    try {
        const { data } = types_1.MedicoSlotQuerySchema.parse(req.query);
        const slots = await medicos_service_1.medicosService.getSlots(req.params.id, data, req.clinica.id);
        return res.json({ success: true, data: { slots } });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /medicos/setup-as-medico
 * Auth: ADMIN — allows an admin to configure themselves as a médico
 * Creates a Medico record linked to the admin's utilizadorId
 */
router.post('/setup-as-medico', (0, requireRole_1.requireRole)([client_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const body = types_1.MedicoCreateSchema.parse(req.body);
        // Force utilizadorId to be the logged-in admin's ID
        const data = {
            ...body,
            utilizadorId: req.user.id,
            email: undefined, // Don't create new user, use existing
        };
        const medico = await medicos_service_1.medicosService.create(data, req.clinica.id);
        return res.status(201).json({ success: true, data: medico });
    }
    catch (err) {
        return next(err);
    }
});
router.post('/', (0, requireRole_1.requireRole)([client_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const body = types_1.MedicoCreateSchema.parse(req.body);
        const medico = await medicos_service_1.medicosService.create(body, req.clinica.id);
        return res.status(201).json({ success: true, data: medico });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /medicos/:id
 * Auth: ADMIN
 */
router.patch('/:id', (0, requireRole_1.requireRole)([client_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const body = types_1.MedicoUpdateSchema.parse(req.body);
        const medico = await medicos_service_1.medicosService.update(req.params.id, body, req.clinica.id);
        return res.json({ success: true, data: medico });
    }
    catch (err) {
        return next(err);
    }
});
exports.default = router;
