"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const anamneses_service_1 = require("../services/anamneses.service");
const types_1 = require("@clinicaplus/types");
const AppError_1 = require("../lib/AppError");
const router = (0, express_1.Router)();
/**
 * GET /api/anamneses/templates/:especialidade
 * Retorna as perguntas do template para uma especialidade.
 */
router.get('/templates/:especialidade', (req, res) => {
    const { especialidade } = req.params;
    const template = types_1.ANAMNESE_TEMPLATES[especialidade];
    if (!template) {
        throw new AppError_1.AppError('Template não encontrado para esta especialidade', 404);
    }
    res.json(template);
});
/**
 * GET /api/anamneses/agendamento/:agendamentoId
 * Busca a anamnese de um agendamento específico.
 */
router.get('/agendamento/:agendamentoId', async (req, res) => {
    const { agendamentoId } = req.params;
    const clinicaId = req.clinica.id;
    const anamnese = await anamneses_service_1.AnamneseService.getByAgendamento(clinicaId, agendamentoId);
    res.json(anamnese);
});
/**
 * GET /api/anamneses/paciente/:pacienteId
 * Busca o histórico de anamneses de um paciente.
 */
router.get('/paciente/:pacienteId', async (req, res) => {
    const { pacienteId } = req.params;
    const clinicaId = req.clinica.id;
    const anamneses = await anamneses_service_1.AnamneseService.getByPaciente(clinicaId, pacienteId);
    res.json(anamneses);
});
/**
 * GET /api/anamneses/:id
 * Busca uma anamnese específica por ID.
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const clinicaId = req.clinica.id;
    const anamnese = await anamneses_service_1.AnamneseService.getById(clinicaId, id);
    res.json(anamnese);
});
/**
 * POST /api/anamneses
 * Cria uma nova anamnese.
 */
router.post('/', async (req, res) => {
    const clinicaId = req.clinica.id;
    const validated = types_1.AnamneseCreateSchema.parse(req.body);
    const anamnese = await anamneses_service_1.AnamneseService.create(clinicaId, validated);
    res.status(201).json(anamnese);
});
/**
 * PATCH /api/anamneses/:id
 * Atualiza as respostas de uma anamnese.
 */
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const clinicaId = req.clinica.id;
    const validated = types_1.AnamneseUpdateSchema.parse(req.body);
    const anamnese = await anamneses_service_1.AnamneseService.update(clinicaId, id, validated);
    res.json(anamnese);
});
exports.default = router;
