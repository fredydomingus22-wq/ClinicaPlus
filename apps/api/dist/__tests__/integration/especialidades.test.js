"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_1 = require("../helpers/request");
const request = (0, request_1.createTestApp)();
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('/api/especialidades', () => {
    let ctx;
    let especialidadeId;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.describe)('POST /api/especialidades', () => {
        (0, vitest_1.it)('creates a new especialidade', async () => {
            const res = await request
                .post('/api/especialidades')
                .set('Authorization', `Bearer ${ctx.adminToken}`)
                .send({
                nome: 'Cardiologia',
                descricao: 'Especialista do coraÃ§Ã£o'
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.nome).toBe('Cardiologia');
            especialidadeId = res.body.data.id;
        });
    });
    (0, vitest_1.describe)('GET /api/especialidades', () => {
        (0, vitest_1.it)('returns a list of especialidades', async () => {
            const res = await request
                .get('/api/especialidades')
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body.data.items)).toBe(true);
            (0, vitest_1.expect)(res.body.data.items.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('PATCH /api/especialidades/:id', () => {
        (0, vitest_1.it)('updates an especialidade', async () => {
            const res = await request
                .patch(`/api/especialidades/${especialidadeId}`)
                .set('Authorization', `Bearer ${ctx.adminToken}`)
                .send({
                nome: 'Cardiologia AvanÃ§ada'
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.nome).toBe('Cardiologia AvanÃ§ada');
        });
    });
});
