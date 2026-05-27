"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exames_service_1 = require("../services/exames.service");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
// List all for Clinic (Global)
router.get('/', (0, requireRole_1.requireRole)(['ADMIN', 'MEDICO']), async (req, res, next) => {
    try {
        const filters = {
            estado: req.query.estado,
            q: req.query.q
        };
        const records = await exames_service_1.examesService.listAll(req.clinica.id, filters);
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
    try {
        const records = await exames_service_1.examesService.listByPaciente(req.clinica.id, req.params.pacienteId);
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// Create request
router.post('/', (0, requireRole_1.requireRole)(['ADMIN', 'MEDICO']), async (req, res, next) => {
    try {
        const record = await exames_service_1.examesService.create(req.clinica.id, req.body);
        res.status(201).json(record);
    }
    catch (err) {
        next(err);
    }
});
// Update Exam (Patch)
router.patch('/:id', (0, requireRole_1.requireRole)(['ADMIN', 'MEDICO']), async (req, res, next) => {
    try {
        const id = req.params.id;
        const record = await exames_service_1.examesService.update(req.clinica.id, id, req.body);
        res.json(record);
    }
    catch (err) {
        next(err);
    }
});
// Get Signed URL for Upload
router.post('/:id/laudo-upload-url', (0, requireRole_1.requireRole)(['ADMIN', 'MEDICO']), async (req, res, next) => {
    try {
        const id = req.params.id;
        const { fileName } = req.body;
        const data = await exames_service_1.examesService.getLaudoUploadUrl(req.clinica.id, id, fileName);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
// Confirm Upload
router.post('/:id/laudo-confirmar', (0, requireRole_1.requireRole)(['ADMIN', 'MEDICO']), async (req, res, next) => {
    try {
        const id = req.params.id;
        const { path } = req.body;
        const record = await exames_service_1.examesService.confirmLaudo(req.clinica.id, id, path);
        res.json(record);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
