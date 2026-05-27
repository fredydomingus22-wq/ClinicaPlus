"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 1. Mock do config ANTES de importar n8nApi
vitest_1.vi.mock('./config', () => ({
    config: {
        N8N_BASE_URL: 'https://n8n-test.ao',
        N8N_API_KEY: 'test-n8n-key',
    }
}));
const vitest_1 = require("vitest");
const axios_1 = __importDefault(require("axios"));
// 2. Mock do axios com suporte para .create()
vitest_1.vi.mock('axios', () => {
    const mAxios = {
        create: vitest_1.vi.fn(),
        post: vitest_1.vi.fn(),
        get: vitest_1.vi.fn(),
        delete: vitest_1.vi.fn(),
    };
    mAxios.create.mockReturnValue(mAxios);
    return { default: mAxios, ...mAxios };
});
const mockedAxios = axios_1.default;
const n8nApi_1 = require("./n8nApi");
const client_1 = require("@prisma/client");
(0, vitest_1.describe)('n8nApi', () => {
    const vars = {
        clinicaId: 'clinica-1',
        clinicaSlug: 'teste',
        instanceName: 'instancia-1',
        apiBaseUrl: 'https://api-test.ao',
        apiKey: 'internal-key',
        automacaoId: 'auto-1',
        configuracao: {},
    };
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('criarWorkflow', () => {
        (0, vitest_1.it)('deve fazer POST /api/v1/workflows com template correcto', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-123', nodes: [] } });
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            await n8nApi_1.n8nApi.criarWorkflow(client_1.WaTipoAutomacao.BOAS_VINDAS, vars);
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/v1/workflows', vitest_1.expect.objectContaining({
                name: vitest_1.expect.stringContaining('WA — ')
            }));
        });
        (0, vitest_1.it)('deve activar o workflow imediatamente após criar', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-123', nodes: [] } });
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            await n8nApi_1.n8nApi.criarWorkflow(client_1.WaTipoAutomacao.BOAS_VINDAS, vars);
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenNthCalledWith(2, '/api/v1/workflows/wf-123/activate');
        });
        (0, vitest_1.it)('deve retornar workflowId e webhookPath', async () => {
            const mockWebhookNode = { type: 'n8n-nodes-base.webhook', parameters: { path: 'rota-webhook' } };
            mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-456', nodes: [mockWebhookNode] } });
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            const result = await n8nApi_1.n8nApi.criarWorkflow(client_1.WaTipoAutomacao.BOAS_VINDAS, vars);
            (0, vitest_1.expect)(result).toEqual({ workflowId: 'wf-456', webhookPath: 'rota-webhook' });
        });
        (0, vitest_1.it)('deve usar template MARCACAO_CONSULTA para tipo correcto', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-789', nodes: [] } });
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            await n8nApi_1.n8nApi.criarWorkflow(client_1.WaTipoAutomacao.MARCACAO_CONSULTA, vars);
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/v1/workflows', vitest_1.expect.objectContaining({
                name: vitest_1.expect.stringContaining('Marcação'),
            }));
        });
        (0, vitest_1.it)('deve usar template LEMBRETE_24H para tipo correcto', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-321', nodes: [] } });
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            await n8nApi_1.n8nApi.criarWorkflow(client_1.WaTipoAutomacao.LEMBRETE_24H, vars);
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/v1/workflows', vitest_1.expect.objectContaining({
                name: vitest_1.expect.stringContaining('Lembrete 24h'),
            }));
        });
    });
    (0, vitest_1.describe)('desactivar', () => {
        (0, vitest_1.it)('deve fazer POST /api/v1/workflows/:id/deactivate', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            await n8nApi_1.n8nApi.desactivar('wf-123');
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenCalledWith('/api/v1/workflows/wf-123/deactivate');
        });
    });
    (0, vitest_1.describe)('eliminar', () => {
        (0, vitest_1.it)('deve fazer DELETE /api/v1/workflows/:id', async () => {
            mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
            await n8nApi_1.n8nApi.eliminar('wf-123');
            (0, vitest_1.expect)(mockedAxios.delete).toHaveBeenCalledWith('/api/v1/workflows/wf-123');
        });
    });
});
