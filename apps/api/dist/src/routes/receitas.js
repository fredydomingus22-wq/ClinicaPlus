"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const receitas_service_1 = require("../services/receitas.service");
const requireRole_1 = require("../middleware/requireRole");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
/**
 * GET /receitas
 * Auth: ADMIN, MEDICO
 */
router.get('/', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const query = types_1.ReceitaListQuerySchema.parse(req.query);
        // Security: If user is a medico, force filter by their medico profile
        if (req.user.papel === types_1.Papel.MEDICO) {
            const medico = await prisma_1.prisma.medico.findUnique({
                where: { utilizadorId: req.user.id }
            });
            if (medico) {
                query.medicoId = medico.id;
            }
        }
        const result = await receitas_service_1.receitasService.list(req.clinica.id, query);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /receitas/minhas
 * Auth: PACIENTE
 */
router.get('/minhas', (0, requireRole_1.requireRole)([types_1.Papel.PACIENTE]), async (req, res, next) => {
    try {
        const result = await receitas_service_1.receitasService.getMinhas(req.user.id, req.clinica.id);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /receitas/:id
 * Auth: All roles (Ownership check for PACIENTE)
 */
router.get('/:id', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.MEDICO, types_1.Papel.PACIENTE]), async (req, res, next) => {
    try {
        const receta = await receitas_service_1.receitasService.getOne(req.params.id, req.clinica.id);
        // If user is a patient, they can only see their own prescriptions
        if (req.user.papel === types_1.Papel.PACIENTE) {
            const paciente = await prisma_1.prisma.paciente.findUnique({
                where: { utilizadorId: req.user.id }
            });
            if (!paciente || receta.pacienteId !== paciente.id) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Receita não encontrada', code: 'NOT_FOUND' },
                });
            }
        }
        // If user is a medico, ensure they issued it or it belongs to their patient in this clinic
        if (req.user.papel === types_1.Papel.MEDICO) {
            const medico = await prisma_1.prisma.medico.findUnique({
                where: { utilizadorId: req.user.id }
            });
            if (medico && receta.medicoId !== medico.id) {
                // Allow access if they are the issuing doctor. In the future maybe allow other doctors in the same clinic?
                // Current rule: only issuing doctor or admin.
                return res.status(403).json({
                    success: false,
                    error: { message: 'Acesso negado a esta receita', code: 'FORBIDDEN' },
                });
            }
        }
        return res.json({ success: true, data: receta });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /receitas
 * Auth: MEDICO
 */
router.post('/', (0, requireRole_1.requireRole)([types_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const body = types_1.ReceitaCreateSchema.parse(req.body);
        const receta = await receitas_service_1.receitasService.create(body, req.clinica.id, req.user.id);
        return res.status(201).json({ success: true, data: receta });
    }
    catch (err) {
        return next(err);
    }
});
exports.default = router;
