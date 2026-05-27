"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_mock_1 = require("../test/mocks/prisma.mock");
const n8nApi_mock_1 = require("../test/mocks/n8nApi.mock");
const wa_automacao_service_1 = require("./wa-automacao.service");
const client_1 = require("@prisma/client");
// Mock config
vitest_1.vi.mock('../lib/config', () => ({
    config: { FRONTEND_URL: 'https://app.test:5173' }
}));
// Mock n8nApi
vitest_1.vi.mock('../lib/n8nApi', () => ({
    n8nApi: n8nApi_mock_1.mockN8nApi,
}));
// Mock auditLogService and apiKeysService
vitest_1.vi.mock('./auditLog.service', () => ({
    auditLogService: { log: vitest_1.vi.fn() }
}));
vitest_1.vi.mock('./apikeys.service', () => ({
    apiKeysService: { getOrCreateInternal: vitest_1.vi.fn().mockResolvedValue({ tokenPlain: 'test-api-key' }) }
}));
const auditLog_service_1 = require("./auditLog.service");
const apikeys_service_1 = require("./apikeys.service");
(0, vitest_1.describe)('waAutomacaoService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData());
        prisma_mock_1.mockPrisma.waAutomacao.findUniqueOrThrow.mockResolvedValue(getMockData());
        prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getMockData = (tipo = client_1.WaTipoAutomacao.LEMBRETE_24H) => ({
        id: 'aut-1',
        tipo,
        configuracao: {},
        n8nWorkflowId: null,
        n8nWebhookPath: null,
        ativo: false,
        clinicaId: 'clinica-1',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        instancia: {
            id: 'inst-1',
            clinicaId: 'clinica-1',
            estado: client_1.WaEstadoInstancia.CONECTADO,
            evolutionName: 'evo-1',
            evolutionToken: 'tok-1',
            criadoEm: new Date(),
            atualizadoEm: new Date(),
            numeroTelefone: '123',
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    });
    (0, vitest_1.describe)('activar', () => {
        (0, vitest_1.it)('deve criar workflow n8n com template correcto por tipo', async () => {
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData(client_1.WaTipoAutomacao.LEMBRETE_24H));
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
            await wa_automacao_service_1.waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');
            (0, vitest_1.expect)(n8nApi_mock_1.mockN8nApi.criarWorkflow).toHaveBeenCalledWith(client_1.WaTipoAutomacao.LEMBRETE_24H, vitest_1.expect.any(Object));
        });
        (0, vitest_1.it)('deve guardar n8nWorkflowId e n8nWebhookPath no DB', async () => {
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData());
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
            n8nApi_mock_1.mockN8nApi.criarWorkflow.mockResolvedValue({ workflowId: 'wf-123', webhookPath: '/webhook/test' });
            await wa_automacao_service_1.waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waAutomacao.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    n8nWorkflowId: 'wf-123',
                    n8nWebhookPath: '/webhook/test'
                })
            }));
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waAutomacao.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    ativo: true
                })
            }));
        });
        (0, vitest_1.it)('deve falhar se instância não está CONECTADA', async () => {
            const mockDisconnected = getMockData();
            mockDisconnected.instancia.estado = client_1.WaEstadoInstancia.DESCONECTADO;
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockDisconnected);
            await (0, vitest_1.expect)(wa_automacao_service_1.waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1'))
                .rejects.toThrow('Liga o WhatsApp desta instância antes');
        });
        (0, vitest_1.it)('deve gerar/reutilizar API key interna para o n8n', async () => {
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData());
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
            await wa_automacao_service_1.waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');
            (0, vitest_1.expect)(apikeys_service_1.apiKeysService.getOrCreateInternal).toHaveBeenCalledWith('clinica-1', 'n8n-lembrete_24h');
        });
        (0, vitest_1.it)('deve registar auditoria de activação', async () => {
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData());
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
            await wa_automacao_service_1.waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');
            (0, vitest_1.expect)(auditLog_service_1.auditLogService.log).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                accao: 'UPDATE',
                depois: vitest_1.expect.objectContaining({ ativo: true })
            }));
        });
        (0, vitest_1.it)('deve activar cada um dos 5 tipos de automação sem erro', async () => {
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
            const tipos = Object.values(client_1.WaTipoAutomacao);
            for (const tipo of tipos) {
                prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData(tipo));
                await (0, vitest_1.expect)(wa_automacao_service_1.waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1')).resolves.not.toThrow();
            }
        });
    });
    (0, vitest_1.describe)('desactivar', () => {
        (0, vitest_1.it)('deve desactivar workflow no n8n', async () => {
            const mockData = getMockData();
            mockData.n8nWorkflowId = 'wf-123';
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockData);
            await wa_automacao_service_1.waAutomacaoService.desactivar('aut-1', 'clinica-1', 'user-1');
            (0, vitest_1.expect)(n8nApi_mock_1.mockN8nApi.desactivar).toHaveBeenCalledWith('wf-123');
        });
        (0, vitest_1.it)('deve marcar automacao.ativo=false mesmo se n8n estiver em baixo', async () => {
            const mockData = getMockData();
            mockData.n8nWorkflowId = 'wf-123';
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockData);
            n8nApi_mock_1.mockN8nApi.desactivar.mockRejectedValue(new Error('n8n fora do ar'));
            await wa_automacao_service_1.waAutomacaoService.desactivar('aut-1', 'clinica-1', 'user-1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waAutomacao.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ data: { ativo: false } }));
        });
        (0, vitest_1.it)('deve registar auditoria de desactivação', async () => {
            const mockData = getMockData();
            mockData.n8nWorkflowId = 'wf-123';
            prisma_mock_1.mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockData);
            await wa_automacao_service_1.waAutomacaoService.desactivar('aut-1', 'clinica-1', 'user-1');
            (0, vitest_1.expect)(auditLog_service_1.auditLogService.log).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                accao: 'UPDATE',
                depois: vitest_1.expect.objectContaining({ ativo: false })
            }));
        });
    });
});
