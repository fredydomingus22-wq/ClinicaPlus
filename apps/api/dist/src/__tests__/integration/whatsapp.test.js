"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../server");
const wa_instancia_service_1 = require("../../services/wa-instancia.service");
const wa_webhook_service_1 = require("../../services/wa-webhook.service");
// Mock dos serviços
vitest_1.vi.mock('../../services/wa-instancia.service', () => ({
    waInstanciaService: {
        criar: vitest_1.vi.fn(),
        obterQrCode: vitest_1.vi.fn(),
        estado: vitest_1.vi.fn(),
        desconectar: vitest_1.vi.fn(),
    }
}));
// helper removed as it was unused and causing lint errors
vitest_1.vi.mock('../../services/wa-webhook.service', () => ({
    waWebhookService: {
        handle: vitest_1.vi.fn(),
    }
}));
// Mock do middleware de autenticação (para simplificar os testes de integração)
vitest_1.vi.mock('../../middleware/authenticate', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking request and response
    authenticate: (req, _res, next) => {
        req.user = { id: 'user-1' };
        next();
    }
}));
vitest_1.vi.mock('../../middleware/tenant', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking request and response
    tenantMiddleware: (req, _res, next) => {
        req.clinica = { id: 'clinica-1' };
        next();
    }
}));
vitest_1.vi.mock('../../middleware/verificarHmacEvolution', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking request and response
    verificarHmacEvolution: (req, _res, next) => {
        next();
    }
}));
vitest_1.vi.mock('../../middleware/requirePlan', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking
    requirePlan: () => (req, _res, next) => {
        next();
    }
}));
vitest_1.vi.mock('../../middleware/requirePermission', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking
    requirePermission: () => (req, _res, next) => {
        next();
    }
}));
(0, vitest_1.describe)('WhatsApp Routes (Integration)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('POST /api/whatsapp/instancias', () => {
        (0, vitest_1.it)('deve criar uma instância e retornar 201', async () => {
            const mockInstancia = { id: 'inst-1', evolutionName: 'cp-test' };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Casting vi.fn to any for mockResolvedValue
            wa_instancia_service_1.waInstanciaService.criar.mockResolvedValue(mockInstancia);
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/whatsapp/instancias')
                .send();
            (0, vitest_1.expect)(response.status).toBe(201);
            (0, vitest_1.expect)(response.body).toEqual(mockInstancia);
            (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.criar).toHaveBeenCalledWith('clinica-1', 'user-1');
        });
    });
    (0, vitest_1.describe)('POST /api/whatsapp/webhook', () => {
        (0, vitest_1.it)('deve processar o webhook e retornar 200', async () => {
            const payload = { event: 'connection.update', data: {} };
            const signature = 'valid-sig';
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/whatsapp/webhook')
                .set('x-evolution-signature', signature)
                .send(payload);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.text).toBe('OK');
            (0, vitest_1.expect)(wa_webhook_service_1.waWebhookService.handle).toHaveBeenCalled();
        });
    });
});
