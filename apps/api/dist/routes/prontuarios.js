"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prontuarios_service_1 = require("../services/prontuarios.service");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
    try {
        const records = await prontuarios_service_1.prontuariosService.listByPaciente(req.clinica.id, req.params.pacienteId);
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// Create entry
router.post('/', (0, requireRole_1.requireRole)(['ADMIN', 'MEDICO']), async (req, res, next) => {
    try {
        const record = await prontuarios_service_1.prontuariosService.create(req.clinica.id, req.body);
        res.status(201).json(record);
    }
    catch (err) {
        next(err);
    }
});
// Get one
router.get('/:id', async (req, res, next) => {
    try {
        const record = await prontuarios_service_1.prontuariosService.getOne(req.params.id, req.clinica.id);
        res.json(record);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
