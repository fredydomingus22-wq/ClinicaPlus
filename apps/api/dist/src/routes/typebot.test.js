"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../server");
const prisma_1 = require("../lib/prisma");
const config_1 = require("../lib/config");
// Mocks
vitest_1.vi.mock('../lib/prisma', () => ({
    prisma: {
        waInstancia: {
            findFirst: vitest_1.vi.fn(),
        },
    },
}));
// Evitar bloqueio de Redis e Socket IO local durante o supertest
vitest_1.vi.mock('../lib/redis', () => ({
    redis: { ping: vitest_1.vi.fn().mockResolvedValue('PONG'), quit: vitest_1.vi.fn() },
    redisSub: { quit: vitest_1.vi.fn() }
}));
vitest_1.vi.mock('../lib/socket', () => ({
    setupSocket: vitest_1.vi.fn()
}));
(0, vitest_1.describe)('Typebot Webhooks Integration Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('POST /api/typebot/agendamento', () => {
        (0, vitest_1.it)('deve retornar 401 se x-typebot-secret não for fornecido', async () => {
            const res = await (0, supertest_1.default)(server_1.app)
                .post('/api/typebot/agendamento')
                .send({ evolutionInstance: 'test-inst' });
            (0, vitest_1.expect)(res.status).toBe(401);
            (0, vitest_1.expect)(res.body.error.message).toBe('Acesso não autorizado');
        });
        (0, vitest_1.it)('deve retornar 400 se evolutionInstance não for fornecido', async () => {
            const res = await (0, supertest_1.default)(server_1.app)
                .post('/api/typebot/agendamento')
                .set('x-typebot-secret', config_1.config.JWT_SECRET)
                .send({ foo: 'bar' });
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error.message).toBe('Instance name não fornecida');
        });
        (0, vitest_1.it)('deve retornar 404 se a instância não for encontrada na base de dados', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.waInstancia.findFirst).mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.app)
                .post('/api/typebot/agendamento')
                .set('x-typebot-secret', config_1.config.JWT_SECRET)
                .send({ evolutionInstance: 'invalid-inst' });
            (0, vitest_1.expect)(res.status).toBe(404);
            (0, vitest_1.expect)(res.body.error.message).toBe('Instância não encontrada ou desvinculada');
        });
        (0, vitest_1.it)('deve retornar 200 e processar payload se a instância existir na db', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.waInstancia.findFirst).mockResolvedValue({
                id: 'inst-1',
                clinicaId: 'clinica-123',
                evolutionName: 'valid-inst',
            });
            const res = await (0, supertest_1.default)(server_1.app)
                .post('/api/typebot/agendamento')
                .set('x-typebot-secret', config_1.config.JWT_SECRET)
                .send({ evolutionInstance: 'valid-inst', info: 'extra data' });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.message).toBe('Webhook Agendamento processado com sucesso');
        });
    });
});
