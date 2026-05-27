"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const agendamentos_service_1 = require("../services/agendamentos.service");
const requireRole_1 = require("../middleware/requireRole");
const prisma_1 = require("../lib/prisma");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
/**
 * GET /agendamentos
 * Auth: ADMIN, MEDICO, RECEPCIONISTA
 */
router.get('/', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.MEDICO, types_1.Papel.RECEPCIONISTA]), async (req, res, next) => {
    try {
        const query = types_1.AgendamentoListQuerySchema.parse(req.query);
        // Security: If user is a medico, force filter by their medico profile
        if (req.user.papel === types_1.Papel.MEDICO) {
            const medico = await prisma_1.prisma.medico.findUnique({
                where: { utilizadorId: req.user.id }
            });
            if (medico) {
                query.medicoId = medico.id;
            }
        }
        const result = await agendamentos_service_1.agendamentosService.list(req.clinica.id, query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /agendamentos/hoje
 * Auth: ADMIN, MEDICO, RECEPCIONISTA
 */
router.get('/hoje', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.MEDICO, types_1.Papel.RECEPCIONISTA]), async (req, res, next) => {
    try {
        const medicoId = req.query.medicoId;
        const result = await agendamentos_service_1.agendamentosService.getHoje(req.clinica.id, medicoId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /agendamentos/meus
 * Auth: PACIENTE
 */
router.get('/meus', (0, requireRole_1.requireRole)([types_1.Papel.PACIENTE]), async (req, res, next) => {
    try {
        const query = types_1.AgendamentoListQuerySchema.parse(req.query);
        const result = await agendamentos_service_1.agendamentosService.getMeus(req.user.id, req.clinica.id, query);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /agendamentos/:id
 * Auth: All roles (PACIENTE verified for ownership)
 */
router.get('/:id', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.MEDICO, types_1.Papel.RECEPCIONISTA, types_1.Papel.PACIENTE]), async (req, res, next) => {
    try {
        const id = req.params.id;
        const agendamento = await agendamentos_service_1.agendamentosService.getOne(id, req.clinica.id);
        // If user is a patient, they can only see their own appointments
        if (req.user.papel === types_1.Papel.PACIENTE) {
            const paciente = await prisma_1.prisma.paciente.findUnique({
                where: { utilizadorId: req.user.id }
            });
            if (!paciente || agendamento.pacienteId !== paciente.id) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Agendamento não encontrado', code: 'NOT_FOUND' },
                });
            }
        }
        // If user is a medico, ensure the appointment is assigned to them (or they are admin)
        if (req.user.papel === types_1.Papel.MEDICO) {
            const medico = await prisma_1.prisma.medico.findUnique({
                where: { utilizadorId: req.user.id }
            });
            if (medico && agendamento.medicoId !== medico.id) {
                // Medico can only see their own appointments unless they have higher permission (Admin check is already in requireRole but this handles medico explicitly)
                return res.status(403).json({
                    success: false,
                    error: { message: 'Acesso negado a este agendamento', code: 'FORBIDDEN' },
                });
            }
        }
        return res.json({ success: true, data: agendamento });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /agendamentos
 * Auth: ADMIN, RECEPCIONISTA, PACIENTE
 */
router.post('/', rateLimiter_1.bookingRateLimiter, (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.RECEPCIONISTA, types_1.Papel.PACIENTE]), async (req, res, next) => {
    try {
        const body = types_1.AgendamentoCreateSchema.parse(req.body);
        // If patient is creating, force the pacienteId to their own
        if (req.user.papel === types_1.Papel.PACIENTE) {
            const paciente = await prisma_1.prisma.paciente.findUnique({
                where: { utilizadorId: req.user.id }
            });
            if (!paciente || paciente.clinicaId !== req.clinica.id) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Perfil de paciente não encontrado', code: 'PATIENT_NOT_FOUND' },
                });
            }
            body.pacienteId = paciente.id;
        }
        const agendamento = await agendamentos_service_1.agendamentosService.create(body, req.clinica.id);
        return res.status(201).json({ success: true, data: agendamento });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /agendamentos/:id/estado
 * Auth: ADMIN, MEDICO, RECEPCIONISTA (PACIENTE: CANCELADO only)
 */
router.patch('/:id/estado', async (req, res, next) => {
    try {
        const id = req.params.id;
        const body = types_1.AgendamentoUpdateEstadoSchema.parse(req.body);
        if (req.user.papel === types_1.Papel.PACIENTE) {
            if (body.estado !== 'CANCELADO') {
                return res.status(403).json({
                    success: false,
                    error: { message: 'Apenas cancelamentos são permitidos', code: 'FORBIDDEN' },
                });
            }
            // Check ownership: find the patient linked to this user and verify this appointment belongs to them
            const agendamento = await agendamentos_service_1.agendamentosService.getOne(id, req.clinica.id);
            const paciente = await prisma_1.prisma.paciente.findFirst({
                where: { utilizadorId: req.user.id, clinicaId: req.clinica.id },
            });
            if (!paciente || agendamento.pacienteId !== paciente.id) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Agendamento não encontrado', code: 'NOT_FOUND' },
                });
            }
        }
        const updated = await agendamentos_service_1.agendamentosService.updateEstado(id, req.clinica.id, body, req.user.id);
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /agendamentos/:id/triagem
 * Auth: RECEPCIONISTA
 */
router.patch('/:id/triagem', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.RECEPCIONISTA]), async (req, res, next) => {
    try {
        const id = req.params.id;
        const body = types_1.AgendamentoTriagemSchema.parse(req.body);
        const updated = await agendamentos_service_1.agendamentosService.registarTriagem(id, req.clinica.id, body);
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /agendamentos/:id/consulta
 * Auth: MEDICO
 */
router.patch('/:id/consulta', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const id = req.params.id;
        const body = types_1.AgendamentoConsultaSchema.parse(req.body);
        // Explicitly preserve finalizar flag from raw body in case Zod strips it from stale types
        const dataWithFlag = { ...body, finalizar: req.body.finalizar === true };
        const updated = await agendamentos_service_1.agendamentosService.registarConsulta(id, req.clinica.id, dataWithFlag);
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return next(err);
    }
});
exports.default = router;
