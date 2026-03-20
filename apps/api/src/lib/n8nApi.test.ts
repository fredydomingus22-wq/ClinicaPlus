// 1. Mock do config ANTES de importar n8nApi
vi.mock('./config', () => ({
  config: {
    N8N_BASE_URL: 'https://n8n-test.ao',
    N8N_API_KEY: 'test-n8n-key',
  }
}));

import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import axios from 'axios';

// 2. Mock do axios com suporte para .create()
vi.mock('axios', () => {
  const mAxios = {
    create: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };
  mAxios.create.mockReturnValue(mAxios);
  return { default: mAxios, ...mAxios };
});

const mockedAxios = axios as Mocked<typeof axios>;
import { n8nApi, type TemplateVars } from './n8nApi';
import { WaTipoAutomacao } from '@prisma/client';

describe('n8nApi', () => {
  const vars: TemplateVars = {
    clinicaId: 'clinica-1',
    clinicaSlug: 'teste',
    instanceName: 'instancia-1',
    apiBaseUrl: 'https://api-test.ao',
    apiKey: 'internal-key',
    automacaoId: 'auto-1',
    configuracao: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarWorkflow', () => {
    it('deve fazer POST /api/v1/workflows com template correcto', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-123', nodes: [] } });
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await n8nApi.criarWorkflow(WaTipoAutomacao.BOAS_VINDAS, vars);

      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/v1/workflows', expect.objectContaining({
        name: expect.stringContaining('WA — ')
      }));
    });

    it('deve activar o workflow imediatamente após criar', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-123', nodes: [] } });
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await n8nApi.criarWorkflow(WaTipoAutomacao.BOAS_VINDAS, vars);

      expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/api/v1/workflows/wf-123/activate');
    });

    it('deve retornar workflowId e webhookPath', async () => {
      const mockWebhookNode = { type: 'n8n-nodes-base.webhook', parameters: { path: 'rota-webhook' } };
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-456', nodes: [mockWebhookNode] } });
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await n8nApi.criarWorkflow(WaTipoAutomacao.BOAS_VINDAS, vars);

      expect(result).toEqual({ workflowId: 'wf-456', webhookPath: 'rota-webhook' });
    });

    it('deve usar template MARCACAO_CONSULTA para tipo correcto', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-789', nodes: [] } });
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await n8nApi.criarWorkflow(WaTipoAutomacao.MARCACAO_CONSULTA, vars);

      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/v1/workflows', expect.objectContaining({
        name: expect.stringContaining('Marcação'),
      }));
    });

    it('deve usar template LEMBRETE_24H para tipo correcto', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-321', nodes: [] } });
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await n8nApi.criarWorkflow(WaTipoAutomacao.LEMBRETE_24H, vars);

      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/v1/workflows', expect.objectContaining({
        name: expect.stringContaining('Lembrete 24h'),
      }));
    });
  });

  describe('desactivar', () => {
    it('deve fazer POST /api/v1/workflows/:id/deactivate', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await n8nApi.desactivar('wf-123');

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/workflows/wf-123/deactivate');
    });
  });

  describe('eliminar', () => {
    it('deve fazer DELETE /api/v1/workflows/:id', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

      await n8nApi.eliminar('wf-123');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/v1/workflows/wf-123');
    });
  });
});
