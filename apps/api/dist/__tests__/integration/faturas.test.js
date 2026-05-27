"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../server");
const client_1 = require("@prisma/client");
const factories_1 = require("../helpers/factories");
(0, vitest_1.describe)('Faturas & Pagamentos API', () => {
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        if (ctx) {
            // apagar as faturas/pagamentos criadas pelo teste antes de apagar a clinica
            await factories_1.factories.cleanupClinica(ctx.clinica.id);
        }
    });
    let faturaId;
    (0, vitest_1.it)('1. POST /api/faturas -> deve criar uma fatura em RASCUNHO com itens', async () => {
        const payload = {
            pacienteId: ctx.paciente.id,
            tipo: client_1.TipoFatura.PARTICULAR,
            desconto: 500,
            itens: [
                { descricao: 'Consulta', quantidade: 1, precoUnit: 10000, desconto: 0 },
                { descricao: 'Exame', quantidade: 2, precoUnit: 5000, desconto: 1000 },
            ],
        };
        const res = await (0, supertest_1.default)(server_1.app)
            .post('/api/faturas')
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.estado).toBe(client_1.EstadoFatura.RASCUNHO);
        (0, vitest_1.expect)(res.body.data.numeroFatura).toMatch(/^F-\d{4}-\d{5}$/);
        // Subtotal = (1*10000) + (2*5000 - 1000) = 10000 + 9000 = 19000
        // Total final = Subtotal (19000) - Desconto Fatura (500) = 18500
        (0, vitest_1.expect)(res.body.data.subtotal).toBe(19000);
        (0, vitest_1.expect)(res.body.data.total).toBe(18500);
        faturaId = res.body.data.id;
    });
    (0, vitest_1.it)('2. PATCH /api/faturas/:id/emitir -> deve emitir a fatura', async () => {
        const res = await (0, supertest_1.default)(server_1.app)
            .patch(`/api/faturas/${faturaId}/emitir`)
            .set('Authorization', `Bearer ${ctx.adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.estado).toBe(client_1.EstadoFatura.EMITIDA);
        (0, vitest_1.expect)(res.body.data.dataEmissao).toBeDefined();
    });
    (0, vitest_1.it)('3. POST /api/faturas/:id/pagamentos -> pagamento parcial', async () => {
        const payload = {
            metodo: client_1.MetodoPagamento.TPA,
            valor: 8500,
            referencia: 'TPA-123',
        };
        const res = await (0, supertest_1.default)(server_1.app)
            .post(`/api/faturas/${faturaId}/pagamentos`)
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.valor).toBe(8500);
        // Fatura ainda deve estar EMITIDA
        const faturaRes = await (0, supertest_1.default)(server_1.app)
            .get(`/api/faturas/${faturaId}`)
            .set('Authorization', `Bearer ${ctx.adminToken}`);
        (0, vitest_1.expect)(faturaRes.body.data.estado).toBe(client_1.EstadoFatura.EMITIDA);
    });
    (0, vitest_1.it)('4. POST /api/faturas/:id/pagamentos -> pagamento total muda estado para PAGA', async () => {
        const payload = {
            metodo: client_1.MetodoPagamento.DINHEIRO,
            valor: 10000, // Total = 18500, pago 8500, faltam 10000
        };
        const res = await (0, supertest_1.default)(server_1.app)
            .post(`/api/faturas/${faturaId}/pagamentos`)
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send(payload);
        (0, vitest_1.expect)(res.status).toBe(201);
        // Fatura deve ter mudado automaticamente para PAGA
        const faturaRes = await (0, supertest_1.default)(server_1.app)
            .get(`/api/faturas/${faturaId}`)
            .set('Authorization', `Bearer ${ctx.adminToken}`);
        (0, vitest_1.expect)(faturaRes.body.data.estado).toBe(client_1.EstadoFatura.PAGA);
    });
    (0, vitest_1.it)('5. PATCH /api/faturas/:id/anular -> deve falhar sem motivo', async () => {
        const res = await (0, supertest_1.default)(server_1.app)
            .patch(`/api/faturas/${faturaId}/anular`)
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send({}); // sem motivo
        (0, vitest_1.expect)(res.status).toBe(400); // Bad Request (Zod validation)
    });
    (0, vitest_1.it)('6. PATCH /api/faturas/:id/anular -> deve anular com sucesso', async () => {
        const res = await (0, supertest_1.default)(server_1.app)
            .patch(`/api/faturas/${faturaId}/anular`)
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send({ motivo: 'Erro na facturação' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.estado).toBe(client_1.EstadoFatura.ANULADA);
    });
});
