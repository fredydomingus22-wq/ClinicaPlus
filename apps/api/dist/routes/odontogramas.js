"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const odontogramas_service_1 = require("../services/odontogramas.service");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
router.use((0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.MEDICO]));
router.get('/agendamento/:agendamentoId', async (req, res, next) => {
    try {
        const odontograma = await odontogramas_service_1.OdontogramaService.getByAgendamento(req.clinica.id, req.params.agendamentoId);
        res.json(odontograma);
    }
    catch (err) {
        next(err);
    }
});
router.get('/paciente/:pacienteId', async (req, res, next) => {
    try {
        const list = await odontogramas_service_1.OdontogramaService.getByPaciente(req.clinica.id, req.params.pacienteId);
        res.json(list);
    }
    catch (err) {
        next(err);
    }
});
router.get('/', async (req, res, next) => {
    try {
        const { pacienteId, limit } = req.query;
        const list = await odontogramas_service_1.OdontogramaService.list(req.clinica.id, pacienteId, limit ? parseInt(limit) : undefined);
        res.json(list);
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const odontograma = await odontogramas_service_1.OdontogramaService.getById(req.clinica.id, req.params.id);
        res.json(odontograma);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const validated = types_1.OdontogramaCreateSchema.parse(req.body);
        const odontograma = await odontogramas_service_1.OdontogramaService.create(req.clinica.id, validated);
        res.status(201).json(odontograma);
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id', async (req, res, next) => {
    try {
        const validated = types_1.OdontogramaUpdateSchema.parse(req.body);
        const odontograma = await odontogramas_service_1.OdontogramaService.update(req.clinica.id, req.params.id, validated);
        res.json(odontograma);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
