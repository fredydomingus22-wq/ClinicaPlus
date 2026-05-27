"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const planos_service_1 = require("../services/planos.service");
const requirePermission_1 = require("../middleware/requirePermission");
const AppError_1 = require("../lib/AppError");
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// List all for Clinic (Global)
router.get('/', (0, requirePermission_1.requirePermission)('tratamento', 'read'), async (req, res, next) => {
    try {
        const filters = {
            estado: req.query.estado,
            q: req.query.q
        };
        const records = await planos_service_1.planosService.listAll(req.clinica.id, filters);
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// List by Paciente
router.get('/paciente/:pacienteId', async (req, res, next) => {
    try {
        // Segurança: se for paciente, só pode ver os seus próprios planos
        if (req.user.papel === client_1.Papel.PACIENTE) {
            const paciente = await prisma_1.prisma.paciente.findFirst({
                where: { utilizadorId: req.user.id }
            });
            if (!paciente || paciente.id !== req.params.pacienteId) {
                throw new AppError_1.AppError('Acesso negado aos dados de outro paciente', 403);
            }
        }
        else {
            // Outros papéis precisam de permissão de leitura
            await (0, requirePermission_1.requirePermission)('tratamento', 'read')(req, res, () => { });
        }
        const records = await planos_service_1.planosService.listByPaciente(req.clinica.id, req.params.pacienteId);
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// Get Detail by ID
router.get('/:id', (0, requirePermission_1.requirePermission)('tratamento', 'read'), async (req, res, next) => {
    try {
        const record = await planos_service_1.planosService.getById(req.clinica.id, req.params.id);
        res.json(record);
    }
    catch (err) {
        next(err);
    }
});
// Create
router.post('/', (0, requirePermission_1.requirePermission)('tratamento', 'create'), async (req, res, next) => {
    try {
        const record = await planos_service_1.planosService.create(req.clinica.id, req.body);
        res.status(201).json(record);
    }
    catch (err) {
        next(err);
    }
});
// Update
router.patch('/:id', (0, requirePermission_1.requirePermission)('tratamento', 'update'), async (req, res, next) => {
    try {
        const record = await planos_service_1.planosService.update(req.clinica.id, req.params.id, req.body);
        res.json(record);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
