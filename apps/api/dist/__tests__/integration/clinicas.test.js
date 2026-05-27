"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/clinicas', () => {
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('GET /api/clinicas/me', () => {
        (0, vitest_1.it)('returns the clinca details for the authenticated user', async () => {
            const res = await request
                .get('/api/clinicas/me')
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.id).toBe(ctx.clinica.id);
            (0, vitest_1.expect)(res.body.data.nome).toBe(ctx.clinica.nome);
        });
        (0, vitest_1.it)('returns 401 unauthenticated', async () => {
            const res = await request.get('/api/clinicas/me');
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    (0, vitest_1.describe)('PATCH /api/clinicas/me', () => {
        (0, vitest_1.it)('updates configuration for the clinica', async () => {
            const res = await request
                .patch('/api/clinicas/me')
                .set('Authorization', `Bearer ${ctx.adminToken}`)
                .send({
                configuracao: {
                    lembrete24h: false,
                    lembrete2h: true
                }
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.configuracao.lembrete24h).toBe(false);
            (0, vitest_1.expect)(res.body.data.configuracao.lembrete2h).toBe(true);
        });
        (0, vitest_1.it)('prevents non-admins from updating configuration', async () => {
            const res = await request
                .patch('/api/clinicas/me')
                .set('Authorization', `Bearer ${ctx.medicoToken}`)
                .send({ configuracao: { lembrete24h: false } });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
});
