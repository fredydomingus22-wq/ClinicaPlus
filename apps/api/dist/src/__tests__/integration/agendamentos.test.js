"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/agendamentos', () => {
    const app = (0, request_1.createTestApp)();
    let ctx;
    let ctxOther; // For cross-clinic tests
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
        ctxOther = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
        await factories_1.factories.cleanupClinica(ctxOther.clinica.id);
    });
    (0, vitest_1.it)('GET /api/agendamentos/hoje -> lista do dia ordenada por hora', async () => {
        // Create an appointment for today
        const dataHoraValue = new Date();
        dataHoraValue.setHours(10, 0, 0, 0); // 10:00 today UTC
        await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: dataHoraValue.toISOString(), tipo: 'CONSULTA', motivoConsulta: 'Teste Hoje' });
        const res = await app.get('/api/agendamentos/hoje').set((0, request_1.authHeader)(ctx.adminToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data).toBeInstanceOf(Array);
        // We expect at least one from the seeded data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agenda = res.body.data.find((a) => a.paciente.id === ctx.paciente.id && a.medico.id === ctx.medico.id);
        (0, vitest_1.expect)(agenda).toBeDefined();
        (0, vitest_1.expect)(agenda.estado).toBe('PENDENTE');
    });
    (0, vitest_1.it)('POST /api/agendamentos com slot disponível -> 201 com estado PENDENTE', async () => {
        const res = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-09-15T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Dor no peito há 3 dias' });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.estado).toBe('PENDENTE');
    });
    (0, vitest_1.it)('POST /api/agendamentos com slot ocupado -> 409 SLOT_NOT_AVAILABLE', async () => {
        // try exact same slot from previous test
        const res = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-09-15T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Segunda marcação' });
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.success).toBe(false);
        (0, vitest_1.expect)(res.body.error.code).toBe('SLOT_NOT_AVAILABLE');
    });
    (0, vitest_1.it)('POST /api/agendamentos com medico de outra clinica -> 404 PATIENT_NOT_FOUND or MEDICO_NOT_FOUND', async () => {
        const res = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken)) // clinic A
            .send({ pacienteId: ctx.paciente.id, medicoId: ctxOther.medico.id, dataHora: '2026-09-16T10:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Cross clinic fail' });
        // Assuming our service handles clinician check with a 404 (not found in tenant)
        (0, vitest_1.expect)(res.status).toBe(404);
    });
    (0, vitest_1.it)('PATCH /api/agendamentos/:id/estado PENDENTE->CONFIRMADO -> 200', async () => {
        // Create new specific test appointment
        const createRes = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-10-01T14:30:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'To update estado' });
        const agId = createRes.body.data.id;
        // Change to CONFIRMADO
        const res = await app.patch(`/api/agendamentos/${agId}/estado`)
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ estado: 'CONFIRMADO' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.estado).toBe('CONFIRMADO');
    });
    (0, vitest_1.it)('PATCH /api/agendamentos/:id/estado CONFIRMADO->CONCLUIDO -> 409 INVALID_STATE_TRANSITION', async () => {
        // Using previous appointment which is now CONFIRMADO
        // Let's retrieve it first to ensure we use the same id (we can just query it)
        const listRes = await app.get('/api/agendamentos').set((0, request_1.authHeader)(ctx.adminToken));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const confirmados = listRes.body.data.items.filter((a) => a.estado === 'CONFIRMADO');
        const agId = confirmados[0].id;
        const res = await app.patch(`/api/agendamentos/${agId}/estado`)
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ estado: 'CONCLUIDO' });
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
    (0, vitest_1.it)('PATCH /api/agendamentos/:id/triagem -> 200 estado muda para EM_PROGRESSO', async () => {
        // Using the same confirmed appointment
        const listRes = await app.get('/api/agendamentos').set((0, request_1.authHeader)(ctx.adminToken));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agId = listRes.body.data.items.filter((a) => a.estado === 'CONFIRMADO')[0].id;
        const res = await app.patch(`/api/agendamentos/${agId}/triagem`)
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({ peso: 70, altura: 175, pa: '120/80', temperatura: 36.5, urgencia: 'NORMAL' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.estado).toBe('EM_PROGRESSO');
        (0, vitest_1.expect)(res.body.data.triagem.imc).toBeCloseTo(22.86, 1); // verify trigger calculation exists
    });
    (0, vitest_1.it)('GET /api/agendamentos/meus com token de PACIENTE -> lista só os seus', async () => {
        const res = await app.get('/api/agendamentos/meus').set((0, request_1.authHeader)(ctx.pacienteToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.items).toBeInstanceOf(Array);
        for (const item of res.body.data.items) {
            (0, vitest_1.expect)(item.paciente.id).toBe(ctx.paciente.id);
        }
    });
    (0, vitest_1.it)('PATCH /api/agendamentos/:id/estado cancelar paciente -> 200', async () => {
        // Create an appt as patient to then cancel it
        const createRes = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.pacienteToken))
            .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-12-01T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'To cancel' });
        (0, vitest_1.expect)(createRes.status).toBe(201);
        const cancelId = createRes.body.data.id;
        const res = await app.patch(`/api/agendamentos/${cancelId}/estado`)
            .set((0, request_1.authHeader)(ctx.pacienteToken))
            .send({ estado: 'CANCELADO' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.estado).toBe('CANCELADO');
    });
    (0, vitest_1.it)('PATCH /api/agendamentos/:id/estado concluir com token paciente -> 403', async () => {
        // Create a new appointment as patient so we definitely have a PENDENTE one
        const createRes = await app.post('/api/agendamentos')
            .set((0, request_1.authHeader)(ctx.pacienteToken))
            .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-12-02T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Conclude test' });
        (0, vitest_1.expect)(createRes.status).toBe(201);
        const pendenteId = createRes.body.data.id;
        // Test role restriction, patient not allowed to conclude
        const res = await app.patch(`/api/agendamentos/${pendenteId}/estado`)
            .set((0, request_1.authHeader)(ctx.pacienteToken))
            .send({ estado: 'CONCLUIDO' });
        // Since patients cannot reach the generic controller for arbitrary state changes (we restricted it)
        (0, vitest_1.expect)(res.status).toBe(403);
    });
});
