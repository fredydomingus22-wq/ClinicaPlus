"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentos_service_1 = require("../services/documentos.service");
const router = (0, express_1.Router)();
// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
    try {
        const records = await documentos_service_1.documentosService.listByPaciente(req.clinica.id, req.params.pacienteId);
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// Create reference
router.post('/', async (req, res, next) => {
    try {
        const record = await documentos_service_1.documentosService.create(req.clinica.id, req.body);
        res.status(201).json(record);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
