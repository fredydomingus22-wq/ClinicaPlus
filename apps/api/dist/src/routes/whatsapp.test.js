"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const whatsapp_1 = __importDefault(require("./whatsapp"));
const wa_instancia_service_1 = require("../services/wa-instancia.service");
const wa_automacao_service_1 = require("../services/wa-automacao.service");
const client_1 = require("@prisma/client");
vitest_1.vi.mock('../middleware/authenticate', () => ({
    authenticate: (req, _res, next) => {
        req.user = { id: 'user-1', papel: client_1.Papel.ADMIN, clinicaId: 'clinica-1' };
        next();
    }
}));
vitest_1.vi.mock('../middleware/tenant', () => ({
    tenantMiddleware: (req, _res, next) => {
        req.clinica = { id: 'clinica-1', plano: client_1.Plano.PRO };
        next();
    }
}));
vitest_1.vi.mock('../middleware/requirePlan', () => ({
    requirePlan: () => (_req, _res, next) => next()
}));
vitest_1.vi.mock('../middleware/requireRole', () => ({
    requireRole: () => (_req, _res, next) => next()
}));
vitest_1.vi.mock('../middleware/requirePermission', () => ({
    requirePermission: () => (_req, _res, next) => next()
}));
vitest_1.vi.mock('../middleware/apiKeyAuth', () => ({
    apiKeyAuth: (req, _res, next) => {
        req.clinica = { id: 'clinica-1' };
        next();
    }
}));
vitest_1.vi.mock('../middleware/verificarHmacEvolution', () => ({
    verificarHmacEvolution: (_req, _res, next) => next()
}));
vitest_1.vi.mock('../services/wa-instancia.service', () => ({
    waInstanciaService: {
        criar: vitest_1.vi.fn(),
        obterQrCode: vitest_1.vi.fn(),
        getInstanciaOrThrow: vitest_1.vi.fn(),
        desligar: vitest_1.vi.fn()
    }
}));
vitest_1.vi.mock('../services/wa-automacao.service', () => ({
    waAutomacaoService: {
        listar: vitest_1.vi.fn(),
        activar: vitest_1.vi.fn(),
        desactivar: vitest_1.vi.fn(),
        configurar: vitest_1.vi.fn()
    }
}));
vitest_1.vi.mock('../services/wa-conversa.service', () => ({
    waConversaService: {
        listarActivas: vitest_1.vi.fn()
    }
}));
vitest_1.vi.mock('../services/wa-webhook.service', () => ({
    waWebhookService: {
        handle: vitest_1.vi.fn()
    }
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Injeção de contexto (simula authenticate + tenantMiddleware)
app.use((req, _res, next) => {
    const mockReq = req;
    mockReq.user = { id: 'user-1', papel: client_1.Papel.ADMIN, clinicaId: 'clinica-1' };
    mockReq.clinica = { id: 'clinica-1', plano: client_1.Plano.PRO };
    next();
});
app.use('/api/whatsapp', whatsapp_1.default);
(0, vitest_1.describe)('WhatsApp Routes Integration Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Gestão de Instância', () => {
        (0, vitest_1.it)('POST /api/whatsapp/instancias deve criar instância', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vitest_1.vi.mocked(wa_instancia_service_1.waInstanciaService.criar).mockResolvedValue({ id: 'inst-1', evolutionName: 'evo-1', evolutionToken: 'tok-1' });
            const res = await (0, supertest_1.default)(app).post('/api/whatsapp/instancias');
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.criar).toHaveBeenCalled();
        });
        (0, vitest_1.it)('GET /api/whatsapp/instancias/qrcode deve obter QR code', async () => {
            vitest_1.vi.mocked(wa_instancia_service_1.waInstanciaService.obterQrCode).mockResolvedValue({ qrcode: 'base64' });
            const res = await (0, supertest_1.default)(app).get('/api/whatsapp/instancias/qrcode');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toEqual({ qrcode: 'base64' });
        });
        (0, vitest_1.it)('GET /api/whatsapp/instancias/estado deve retornar estado', async () => {
            vitest_1.vi.mocked(wa_instancia_service_1.waInstanciaService.getInstanciaOrThrow).mockResolvedValue({
                estado: 'CONECTADO',
                numeroTelefone: '123',
                id: 'inst-1',
                clinicaId: 'clinica-1',
                evolutionName: 'evo-1',
                evolutionToken: 'tok-1',
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrCodeBase64: null
            }); // eslint-disable-line @typescript-eslint/no-explicit-any -- Mocked result for service call
            const res = await (0, supertest_1.default)(app).get('/api/whatsapp/instancias/estado');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('estado', 'CONECTADO');
        });
        (0, vitest_1.it)('DELETE /api/whatsapp/instancias deve desligar instância', async () => {
            vitest_1.vi.mocked(wa_instancia_service_1.waInstanciaService.desligar).mockResolvedValue();
            const res = await (0, supertest_1.default)(app).delete('/api/whatsapp/instancias');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.desligar).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('Gestão de Automações', () => {
        (0, vitest_1.it)('GET /api/whatsapp/automacoes deve listar automações', async () => {
            vitest_1.vi.mocked(wa_automacao_service_1.waAutomacaoService.listar).mockResolvedValue([]);
            const res = await (0, supertest_1.default)(app).get('/api/whatsapp/automacoes');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(wa_automacao_service_1.waAutomacaoService.listar).toHaveBeenCalled();
        });
        (0, vitest_1.it)('PATCH /api/whatsapp/automacoes/:id deve atualizar configuração', async () => {
            const res = await (0, supertest_1.default)(app).patch('/api/whatsapp/automacoes/123').send({ config: {} });
            (0, vitest_1.expect)(res.status).toBe(200);
        });
        (0, vitest_1.it)('POST /api/whatsapp/automacoes/:id/activar deve activar automação', async () => {
            vitest_1.vi.mocked(wa_automacao_service_1.waAutomacaoService.activar).mockResolvedValue();
            const res = await (0, supertest_1.default)(app).post('/api/whatsapp/automacoes/123/activar');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(wa_automacao_service_1.waAutomacaoService.activar).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('Endpoints de Fluxo (API Key Auth)', () => {
        (0, vitest_1.it)('POST /api/whatsapp/fluxo/inicio deve retornar 200', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/whatsapp/fluxo/inicio');
            (0, vitest_1.expect)(res.status).toBe(200);
        });
        (0, vitest_1.it)('GET /api/whatsapp/fluxo/conversa deve retornar estado da conversa', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/whatsapp/fluxo/conversa');
            (0, vitest_1.expect)(res.status).toBe(200);
        });
    });
    (0, vitest_1.describe)('Atividade e Relatórios', () => {
        (0, vitest_1.it)('GET /api/whatsapp/actividade deve retornar últimas ações', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/whatsapp/actividade');
            (0, vitest_1.expect)(res.status).toBe(200);
        });
        (0, vitest_1.it)('GET /api/whatsapp/conversas deve listar conversas ativas', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/whatsapp/conversas');
            (0, vitest_1.expect)(res.status).toBe(200);
        });
    });
});
