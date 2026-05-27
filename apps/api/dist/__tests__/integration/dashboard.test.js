"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/dashboard', () => {
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('GET /api/dashboard', () => {
        (0, vitest_1.it)('returns 200 and stats for Admin', async () => {
            const res = await request
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data).toBeDefined();
        });
        (0, vitest_1.it)('returns 403 for unauthorized role', async () => {
            const res = await request
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${ctx.pacienteToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('GET /api/dashboard/medico', () => {
        (0, vitest_1.it)('returns 200 and stats for Medico', async () => {
            const res = await request
                .get('/api/dashboard/medico')
                .set('Authorization', `Bearer ${ctx.medicoToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data).toBeDefined();
        });
    });
});
