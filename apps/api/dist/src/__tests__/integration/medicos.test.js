"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/medicos', () => {
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('GET /api/medicos', () => {
        (0, vitest_1.it)('returns a list of medicos for the clinica', async () => {
            const res = await request
                .get('/api/medicos')
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data.items)).toBe(true);
            (0, vitest_1.expect)(res.body.data.items.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body.data.items[0].nome).toBe(ctx.medico.nome);
        });
    });
    (0, vitest_1.describe)('GET /api/medicos/:id', () => {
        (0, vitest_1.it)('returns specific medico details', async () => {
            const res = await request
                .get(`/api/medicos/${ctx.medico.id}`)
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.id).toBe(ctx.medico.id);
        });
    });
    (0, vitest_1.describe)('PATCH /api/medicos/:id', () => {
        (0, vitest_1.it)('updates a medico details and permissions', async () => {
            const res = await request
                .patch(`/api/medicos/${ctx.medico.id}`)
                .set('Authorization', `Bearer ${ctx.adminToken}`)
                .send({
                duracaoConsulta: 45,
                preco: 5000
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.duracaoConsulta).toBe(45);
            (0, vitest_1.expect)(res.body.data.preco).toBe(5000);
        });
    });
    (0, vitest_1.describe)('GET /api/medicos/:id/slots', () => {
        (0, vitest_1.it)('returns available slots for a medico on a specific date', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await request
                .get(`/api/medicos/${ctx.medico.id}/slots?data=${today}`)
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.slots).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)('returns 400 for invalid date format', async () => {
            const res = await request
                .get(`/api/medicos/${ctx.medico.id}/slots?data=invalid-date`)
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(400);
        });
    });
    (0, vitest_1.describe)('Permissions', () => {
        (0, vitest_1.it)('POST /api/medicos as RECEPCIONISTA -> 403', async () => {
            const res = await request
                .post('/api/medicos')
                .set('Authorization', `Bearer ${ctx.recepcaoToken}`)
                .send({
                nome: 'Novo Medico',
                especialidadeId: ctx.medico.especialidadeId,
                utilizadorId: ctx.admin.id, // Dummy
                horario: {},
            });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('PATCH /api/medicos/:id as RECEPCIONISTA -> 403', async () => {
            const res = await request
                .patch(`/api/medicos/${ctx.medico.id}`)
                .set('Authorization', `Bearer ${ctx.recepcaoToken}`)
                .send({ preco: 9999 });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
});
