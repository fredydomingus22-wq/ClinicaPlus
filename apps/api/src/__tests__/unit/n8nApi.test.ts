import { describe, it, expect, vi, beforeEach } from 'vitest';
import { n8nApi, TemplateVars } from '../../lib/n8nApi';
import axios from 'axios';
import { WaTipoAutomacao } from '@prisma/client';

// Mock do axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn().mockReturnThis(),
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('N8nApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVars: TemplateVars = {
    clinicaId: 'clinica-1',
    clinicaSlug: 'teste',
    instanceName: 'inst-1',
    apiBaseUrl: 'http://api.test',
    apiKey: 'apikey-1',
    automacaoId: 'auto-1',
    configuracao: {}
  };

  describe('criarWorkflow', () => {
    it('deve chamar o endpoint de criação de workflow com o template', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { id: 'wf-123', nodes: [{ type: 'n8n-nodes-base.webhook', parameters: { path: 'test-path' } }] }
      });
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { active: true } });

      const result = await n8nApi.criarWorkflow(WaTipoAutomacao.LEMBRETE_24H, mockVars);

      expect(axios.post).toHaveBeenCalledWith('/api/v1/workflows', expect.any(Object));
      expect(result).toEqual({ workflowId: 'wf-123', webhookPath: 'test-path' });
    });
  });

  describe('activar', () => {
    it('deve activar o workflow especificado', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { active: true } });

      await n8nApi.activar('wf-123');

      expect(axios.post).toHaveBeenCalledWith('/api/v1/workflows/wf-123/activate');
    });
  });

  describe('desactivar', () => {
    it('deve desactivar o workflow especificado', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { active: false } });

      await n8nApi.desactivar('wf-123');

      expect(axios.post).toHaveBeenCalledWith('/api/v1/workflows/wf-123/deactivate');
    });
  });
});
