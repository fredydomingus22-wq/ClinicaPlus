"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/exames', () => {
    let ctx;
    let agendamentoId;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
        // Need to create an agendamento to associate things with
        const resAg = await request
            .post('/api/agendamentos')
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send({
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            dataHora: new Date(Date.now() + 86400000).toISOString(),
            tipoConsulta: 'PRIMEIRA_VEZ',
            duracao: 30,
            observacoes: 'Teste exame',
            origem: 'LOCAL'
        });
        agendamentoId = resAg.body.data.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('POST /api/exames', () => {
        (0, vitest_1.it)('deve requerer autenticacao', async () => {
            await request
                .post('/api/exames')
                .send(factories_1.factories.createExameData('dummy'))
                .expect(401);
        });
        (0, vitest_1.it)('deve criar um exame fisico (Médico)', async () => {
            const res = await request
                .post('/api/exames')
                .set('Authorization', `Bearer ${ctx.medicoToken}`)
                .send(factories_1.factories.createExameData(ctx.paciente.id, agendamentoId, ctx.medico.id));
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.nome).toBe('Exame Físico');
        });
        (0, vitest_1.it)('creates an exame request', async () => {
            const res = await request
                .post('/api/exames')
                .set('Authorization', `Bearer ${ctx.medicoToken}`)
                .send({
                pacienteId: ctx.paciente.id,
                medicoId: ctx.medico.id,
                agendamentoId: agendamentoId,
                tipo: 'LABORATORIO',
                nome: 'Hemograma Completo'
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.nome).toBe('Hemograma Completo');
        });
    });
    (0, vitest_1.describe)('GET /api/exames', () => {
        (0, vitest_1.it)('deve listar exames do paciente via /exames/paciente/:id', async () => {
            const res = await request
                .get(`/api/exames/paciente/${ctx.paciente.id}`)
                .set('Authorization', `Bearer ${ctx.medicoToken}`)
                .expect(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
            (0, vitest_1.expect)(res.body.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body[0].estado).toBeDefined();
        });
        (0, vitest_1.it)('deve listar todos os exames da clínica com filtros', async () => {
            const res = await request
                .get('/api/exames?estado=PENDENTE')
                .set('Authorization', `Bearer ${ctx.medicoToken}`)
                .expect(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
            for (const exame of res.body) {
                (0, vitest_1.expect)(exame.estado).toBe('PENDENTE');
            }
        });
    });
});
