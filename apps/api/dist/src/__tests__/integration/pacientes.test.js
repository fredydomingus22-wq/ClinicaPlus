"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/pacientes', () => {
    const app = (0, request_1.createTestApp)();
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
        // Create an extra patient for search tests
        await factories_1.factories.createPaciente(ctx.clinica.id, { nome: 'JoÃ£o Silva' });
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.it)('GET /api/pacientes -> 200 com lista paginada', async () => {
        const res = await app
            .get('/api/pacientes')
            .set((0, request_1.authHeader)(ctx.adminToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.items).toBeInstanceOf(Array);
        (0, vitest_1.expect)(res.body.data.total).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(res.body.data.page).toBe(1);
    });
    (0, vitest_1.it)('GET /api/pacientes?q=JoÃ£o -> filtra correctamente', async () => {
        const res = await app
            .get('/api/pacientes?q=JoÃ£o')
            .set((0, request_1.authHeader)(ctx.adminToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.items.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(res.body.data.items[0].nome).toContain('JoÃ£o');
    });
    (0, vitest_1.it)('GET /api/pacientes/:id -> 200 com dados do paciente (inclui alergias)', async () => {
        const res = await app
            .get(`/api/pacientes/${ctx.paciente.id}`)
            .set((0, request_1.authHeader)(ctx.adminToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.id).toBe(ctx.paciente.id);
        (0, vitest_1.expect)(res.body.data.alergias).toBeInstanceOf(Array);
    });
    (0, vitest_1.it)('POST /api/pacientes -> 201 com numeroPaciente gerado (P-YYYY-NNNN)', async () => {
        const res = await app
            .post('/api/pacientes')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({
            nome: 'Novo Paciente',
            dataNascimento: '1990-01-01', // Date string
            genero: 'M',
            telemovel1: '923000000',
            alergias: [],
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.numeroPaciente).toMatch(/^P-202\d-\d{4}$/); // Matches year 202x
        (0, vitest_1.expect)(res.body.data.nome).toBe('Novo Paciente');
    });
    (0, vitest_1.it)('POST /api/pacientes com dados invÃ¡lidos -> 400 com field errors (Zod, pt-AO)', async () => {
        const res = await app
            .post('/api/pacientes')
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({
            nome: '', // too short
            genero: 'X', // invalid enum
            dataNascimento: '2000-01-01',
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.success).toBe(false);
        (0, vitest_1.expect)(res.body.error.code).toBe('VALIDATION_ERROR');
        (0, vitest_1.expect)(res.body.error.details).toBeInstanceOf(Array);
        const errors = res.body.error.details;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, vitest_1.expect)(errors.some((e) => e.path === 'nome')).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, vitest_1.expect)(errors.some((e) => e.path === 'genero')).toBe(true);
    });
    (0, vitest_1.it)('PATCH /api/pacientes/:id -> 200 com dados actualizados', async () => {
        const res = await app
            .patch(`/api/pacientes/${ctx.paciente.id}`)
            .set((0, request_1.authHeader)(ctx.adminToken))
            .send({
            nome: 'Nome Atualizado',
            alergias: ['Amendoim'],
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.nome).toBe('Nome Atualizado');
        (0, vitest_1.expect)(res.body.data.alergias).toContain('Amendoim');
    });
    (0, vitest_1.it)('GET /api/pacientes/:id as PACIENTE (own) -> 200', async () => {
        const res = await app
            .get(`/api/pacientes/${ctx.paciente.id}`)
            .set((0, request_1.authHeader)(ctx.pacienteToken));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.id).toBe(ctx.paciente.id);
    });
    (0, vitest_1.it)('GET /api/pacientes/:id as PACIENTE (other) -> 403', async () => {
        const otherPaciente = await factories_1.factories.createPaciente(ctx.clinica.id);
        const res = await app
            .get(`/api/pacientes/${otherPaciente.id}`)
            .set((0, request_1.authHeader)(ctx.pacienteToken));
        (0, vitest_1.expect)(res.status).toBe(403);
    });
    (0, vitest_1.it)('PATCH /api/pacientes/:id as PACIENTE (own) -> 200', async () => {
        const res = await app
            .patch(`/api/pacientes/${ctx.paciente.id}`)
            .set((0, request_1.authHeader)(ctx.pacienteToken))
            .send({ nome: 'Nome Alterado pelo Paciente' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.nome).toBe('Nome Alterado pelo Paciente');
    });
    (0, vitest_1.it)('PATCH /api/pacientes/:id as MEDICO -> 403', async () => {
        const res = await app
            .patch(`/api/pacientes/${ctx.paciente.id}`)
            .set((0, request_1.authHeader)(ctx.medicoToken))
            .send({ nome: 'Tentativa do Medico' });
        (0, vitest_1.expect)(res.status).toBe(403);
    });
    (0, vitest_1.it)('GET /api/pacientes sem token -> 401', async () => {
        const res = await app.get('/api/pacientes');
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('GET /api/pacientes com token de PACIENTE -> 403', async () => {
        const res = await app
            .get('/api/pacientes')
            .set((0, request_1.authHeader)(ctx.pacienteToken));
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error.code).toBe('FORBIDDEN');
    });
});
