"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/prontuarios', () => {
    let ctx;
    let agendamentoId;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
        // Create an agendamento
        const resAg = await request
            .post('/api/agendamentos')
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send({
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            dataHora: new Date(Date.now() + 86400000).toISOString(),
            tipoConsulta: 'PRIMEIRA_VEZ',
            duracao: 30,
            observacoes: 'Teste prontuario',
            origem: 'LOCAL'
        });
        agendamentoId = resAg.body.data.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('POST /api/prontuarios', () => {
        (0, vitest_1.it)('creates a clinical record (prontuario)', async () => {
            const res = await request
                .post('/api/prontuarios')
                .set('Authorization', `Bearer ${ctx.medicoToken}`)
                .send({
                pacienteId: ctx.paciente.id,
                medicoId: ctx.medico.id,
                agendamentoId: agendamentoId,
                tipo: 'EVOLUCAO',
                notas: 'O paciente apresentou melhoras.',
                diagnostico: 'Gripe'
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data ? res.body.data.notas : res.body.notas).toBe('O paciente apresentou melhoras.');
        });
    });
    (0, vitest_1.describe)('GET /api/prontuarios/paciente/:id', () => {
        (0, vitest_1.it)('returns the history of records for a patient', async () => {
            const res = await request
                .get(`/api/prontuarios/paciente/${ctx.paciente.id}`)
                .set('Authorization', `Bearer ${ctx.medicoToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            const data = res.body.data || res.body;
            (0, vitest_1.expect)(Array.isArray(data)).toBe(true);
            (0, vitest_1.expect)(data.length).toBeGreaterThan(0);
        });
    });
});
