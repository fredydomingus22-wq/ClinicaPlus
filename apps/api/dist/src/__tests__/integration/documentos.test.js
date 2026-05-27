"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/documentos', () => {
    let ctx;
    let agendamentoId;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
        const resAg = await request
            .post('/api/agendamentos')
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send({
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            dataHora: new Date(Date.now() + 86400000).toISOString(),
            tipoConsulta: 'PRIMEIRA_VEZ',
            duracao: 30,
            observacoes: 'Teste documento',
            origem: 'LOCAL'
        });
        agendamentoId = resAg.body.data.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('POST /api/documentos', () => {
        (0, vitest_1.it)('generates a clinical document', async () => {
            const res = await request
                .post('/api/documentos')
                .set('Authorization', `Bearer ${ctx.medicoToken}`)
                .send({
                pacienteId: ctx.paciente.id,
                medicoId: ctx.medico.id,
                agendamentoId: agendamentoId,
                tipo: 'RELATORIO_MEDICO',
                nome: 'Atestado Médico',
                url: 'https://example.com/atestado.pdf'
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.nome).toBe('Atestado Médico');
        });
    });
    (0, vitest_1.describe)('GET /api/documentos/paciente/:id', () => {
        (0, vitest_1.it)('returns the documents for a patient', async () => {
            const res = await request
                .get(`/api/documentos/paciente/${ctx.paciente.id}`)
                .set('Authorization', `Bearer ${ctx.medicoToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
            (0, vitest_1.expect)(res.body.length).toBeGreaterThan(0);
        });
    });
});
