"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/receitas', () => {
    const app = (0, request_1.createTestApp)();
    let ctx;
    let ctxOther;
    let pendingAgendamentoId;
    let concludedAgendamentoId;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
        ctxOther = await factories_1.factories.setupClinicaCompleta();
        const createRes = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({
            pacienteId: ctx.paciente.id,
            medicoId: ctx.medico.id,
            dataHora: '2026-11-20T10:00:00.000Z',
            tipo: 'CONSULTA',
            motivoConsulta: 'Test Receitas'
        });
        if (createRes.status !== 201) {
            throw new Error(`Failed to create appointment in beforeAll: ${JSON.stringify(createRes.body)}`);
        }
        pendingAgendamentoId = createRes.body.data.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
        await factories_1.factories.cleanupClinica(ctxOther.clinica.id);
    });
    (0, vitest_1.it)('POST /api/receitas com MEDICO -> 201', async () => {
        // Only MEDICO role is allowed to create prescriptions
        const res = await app.post('/api/receitas')
            .set((0, request_1.authHeader)(ctx.medicoToken))
            .send({
            agendamentoId: pendingAgendamentoId,
            diagnostico: 'Dores de cabeça persistentes',
            medicamentos: [
                { nome: 'Paracetamol', dosagem: '500mg', frequencia: '1x/dia', duracao: '3 dias' }
            ],
            dataValidade: '2027-01-01',
            observacoes: 'Tomar com água',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.medicamentos[0].nome).toBe('Paracetamol');
        // Remember the id for later tests
        concludedAgendamentoId = pendingAgendamentoId;
    });
    (0, vitest_1.it)('POST /api/receitas com ADMIN -> 403', async () => {
        // Create new appt to try to prescribe
        const createRes = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-09-15T10:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Admin prescribe fail' });
        // Try prescribing as Admin - should fail validation or 403
        const res = await app.post('/api/receitas')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({
            agendamentoId: createRes.body.data.id,
            diagnostico: 'Admin trying to prescribe',
            medicamentos: [
                { nome: 'Admin Pill', dosagem: '10mg', frequencia: '1x/dia', duracao: '1 dia' }
            ],
            dataValidade: '2027-01-01',
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error.code).toBe('FORBIDDEN');
    });
    (0, vitest_1.it)('POST /api/receitas para agendamento que já tem receita -> 409', async () => {
        // Try to prescribe AGAIN to the first appointment
        const res = await app.post('/api/receitas')
            .set((0, request_1.authHeader)(ctx.medicoToken))
            .send({
            agendamentoId: concludedAgendamentoId,
            diagnostico: 'More meds for the same issue',
            medicamentos: [
                { nome: 'Ibuprofen', dosagem: '400mg', frequencia: '2x/dia', duracao: '5 dias' }
            ],
            dataValidade: '2027-01-01',
        });
        (0, vitest_1.expect)(res.status).toBe(409);
        // Usually code: 'RECEITA_ALREADY_EXISTS' or similar, depending on the service rules
    });
    (0, vitest_1.it)('GET /api/receitas/minhas com PACIENTE -> lista só as suas receitas', async () => {
        const res = await app.get('/api/receitas/minhas')
            .set((0, request_1.authHeader)(ctx.pacienteToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data).toBeInstanceOf(Array);
        (0, vitest_1.expect)(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('GET /api/receitas/:id de outra clínica -> 404', async () => {
        // Context Other (Clinic B) trying to read a prescription from Clinic A
        // First, let's get the prescription ID
        const listRes = await app.get('/api/receitas/minhas').set((0, request_1.authHeader)(ctx.pacienteToken));
        const receitaId = listRes.body.data[0].id;
        // A MEDICO from Clinic B requests it by ID
        const res = await app.get(`/api/receitas/${receitaId}`)
            .set((0, request_1.authHeader)(ctxOther.medicoToken));
        (0, vitest_1.expect)(res.status).toBe(404);
    });
});
