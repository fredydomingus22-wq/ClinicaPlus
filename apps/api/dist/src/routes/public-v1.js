"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const types_1 = require("@clinicaplus/types");
const pacientes_service_1 = require("../services/pacientes.service");
const agendamentos_service_1 = require("../services/agendamentos.service");
const receitas_service_1 = require("../services/receitas.service");
const router = (0, express_1.Router)();
/**
 * Middleware para verificar escopos da API Key.
 */
function requireScope(scope) {
    return (req, _res, next) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scopes = req.apiScopes || [];
        if (!scopes.includes(scope)) {
            return next(new AppError_1.AppError(`Escopo necessário: ${scope}`, 403, 'INSUFFICIENT_SCOPE'));
        }
        next();
    };
}
/**
 * GET /public/v1/pacientes
 */
router.get('/pacientes', requireScope(types_1.EscopoApiKey.READ_PACIENTES), async (req, res) => {
    const pacientes = await prisma_1.prisma.paciente.findMany({
        where: { clinicaId: req.clinica.id, ativo: true },
        select: {
            id: true,
            numeroPaciente: true,
            nome: true,
            dataNascimento: true,
            genero: true,
            telefone: true,
            email: true
        }
    });
    res.json({ success: true, data: pacientes });
});
/**
 * POST /public/v1/pacientes
 */
router.post('/pacientes', requireScope(types_1.EscopoApiKey.WRITE_PACIENTES), async (req, res, next) => {
    try {
        const data = types_1.PacienteCreateSchema.parse(req.body);
        const paciente = await pacientes_service_1.pacientesService.create(data, req.clinica.id);
        res.status(201).json({ success: true, data: paciente });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /public/v1/agendamentos
 */
router.get('/agendamentos', requireScope(types_1.EscopoApiKey.READ_AGENDAMENTOS), async (req, res) => {
    const agendamentos = await prisma_1.prisma.agendamento.findMany({
        where: { clinicaId: req.clinica.id },
        orderBy: { dataHora: 'desc' },
        select: {
            id: true,
            dataHora: true,
            duracao: true,
            tipo: true,
            estado: true,
            paciente: {
                select: { nome: true, numeroPaciente: true }
            },
            medico: {
                select: { nome: true }
            }
        }
    });
    res.json({ success: true, data: agendamentos });
});
/**
 * POST /public/v1/agendamentos
 */
router.post('/agendamentos', requireScope(types_1.EscopoApiKey.WRITE_AGENDAMENTOS), async (req, res, next) => {
    try {
        const data = types_1.AgendamentoCreateSchema.parse(req.body);
        const agendamento = await agendamentos_service_1.agendamentosService.create(data, req.clinica.id);
        res.status(201).json({ success: true, data: agendamento });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /public/v1/receitas
 */
router.get('/receitas', requireScope(types_1.EscopoApiKey.READ_RECEITAS), async (req, res, next) => {
    try {
        const query = types_1.ReceitaListQuerySchema.parse(req.query);
        const result = await receitas_service_1.receitasService.list(req.clinica.id, query);
        res.json({ success: true, data: result.items, total: result.total });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
