"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/relatorios', () => {
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        if (ctx)
            await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('GET /api/relatorios/receita', () => {
        (0, vitest_1.it)('returns 200 and receita report data for Admin', async () => {
            const res = await request
                .get('/api/relatorios/receita')
                .query({
                inicio: '2026-02-28',
                fim: '2026-03-15',
                agrupamento: 'day'
            })
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.totais).toBeDefined();
            (0, vitest_1.expect)(res.body.data.serie).toBeDefined();
        });
        (0, vitest_1.it)('returns 403 for non-Admin role', async () => {
            const res = await request
                .get('/api/relatorios/receita')
                .set('Authorization', `Bearer ${ctx.pacienteToken}`);
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
});
