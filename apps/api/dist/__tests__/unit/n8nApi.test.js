"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const n8nInstance = {
    interceptors: { response: { use: vitest_1.vi.fn() } },
    post: vitest_1.vi.fn(),
    get: vitest_1.vi.fn(),
    delete: vitest_1.vi.fn(),
};
vitest_1.vi.mock('axios', () => ({
    default: {
        create: vitest_1.vi.fn(() => n8nInstance),
    },
}));
const n8nApi_1 = require("../../lib/n8nApi");
(0, vitest_1.describe)('N8nApi', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    const mockVars = {
        clinicaId: 'clinica-1',
        clinicaSlug: 'teste',
        instanceName: 'inst-1',
        apiBaseUrl: 'http://api.test',
        apiKey: 'apikey-1',
        automacaoId: 'auto-1',
        configuracao: {}
    };
    (0, vitest_1.describe)('criarWorkflow', () => {
        (0, vitest_1.it)('deve chamar o endpoint de criação de workflow com o template', async () => {
            n8nInstance.post.mockResolvedValueOnce({
                data: { id: 'wf-123', nodes: [{ type: 'n8n-nodes-base.webhook', parameters: { path: 'test-path' } }] }
            });
            n8nInstance.post.mockResolvedValueOnce({ data: { active: true } });
            const result = await n8nApi_1.n8nApi.criarWorkflow(client_1.WaTipoAutomacao.LEMBRETE_24H, mockVars);
            (0, vitest_1.expect)(n8nInstance.post).toHaveBeenCalledWith('/api/v1/workflows', vitest_1.expect.any(Object));
            (0, vitest_1.expect)(result).toEqual({ workflowId: 'wf-123', webhookPath: 'test-path' });
        });
    });
    (0, vitest_1.describe)('activar', () => {
        (0, vitest_1.it)('deve activar o workflow especificado', async () => {
            n8nInstance.post.mockResolvedValueOnce({ data: { active: true } });
            await n8nApi_1.n8nApi.activar('wf-123');
            (0, vitest_1.expect)(n8nInstance.post).toHaveBeenCalledWith('/api/v1/workflows/wf-123/activate');
        });
    });
    (0, vitest_1.describe)('desactivar', () => {
        (0, vitest_1.it)('deve desactivar o workflow especificado', async () => {
            n8nInstance.post.mockResolvedValueOnce({ data: { active: false } });
            await n8nApi_1.n8nApi.desactivar('wf-123');
            (0, vitest_1.expect)(n8nInstance.post).toHaveBeenCalledWith('/api/v1/workflows/wf-123/deactivate');
        });
    });
});
