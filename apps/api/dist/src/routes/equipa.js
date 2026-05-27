"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const equipa_service_1 = require("../services/equipa.service");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
/**
 * All equipa routes require ADMIN role.
 * SuperAdmins might manage them across all clinics but current multitenancy guards restrict requests to a specific `clinicaId`.
 */
/**
 * GET /equipa
 * Lists all non-patient/non-medico staff members for the clinic.
 */
router.get('/', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const query = types_1.UtilizadorListQuerySchema.parse(req.query);
        const result = await equipa_service_1.equipaService.list(req.clinica.id, query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /equipa/:id
 * Gets a specific staff member.
 */
router.get('/:id', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await equipa_service_1.equipaService.getOne(id, req.clinica.id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /equipa
 * Creates a new staff member and sends email with generated password.
 */
router.post('/', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const data = types_1.EquipaCreateSchema.parse(req.body);
        const result = await equipa_service_1.equipaService.create(data, req.clinica.id, req.user.id, req.ip);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PATCH /equipa/:id
 * Updates staff member details or status.
 */
router.patch('/:id', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN]), async (req, res, next) => {
    try {
        const id = req.params.id;
        const data = types_1.UtilizadorUpdateSchema.parse(req.body);
        const result = await equipa_service_1.equipaService.update(id, data, req.clinica.id, req.user.id, req.ip);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
