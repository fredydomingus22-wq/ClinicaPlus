"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/equipa', () => {
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('GET /api/equipa', () => {
        (0, vitest_1.it)('returns a list of team members for the clinica', async () => {
            const res = await request
                .get('/api/equipa')
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data.items)).toBe(true);
            (0, vitest_1.expect)(res.body.data.items.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('POST /api/equipa', () => {
        (0, vitest_1.it)('creates a new team member', async () => {
            const res = await request
                .post('/api/equipa')
                .set('Authorization', `Bearer ${ctx.adminToken}`)
                .send({
                nome: 'Novo Recepcionista',
                email: `recepcionista-${Date.now()}@teste.com`,
                papel: 'RECEPCIONISTA',
                password: 'Password123!',
                confirmPassword: 'Password123!'
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.nome).toBe('Novo Recepcionista');
        });
    });
});
