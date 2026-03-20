import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from '../test/mocks/prisma.mock';
import { mockN8nApi } from '../test/mocks/n8nApi.mock';
import { waAutomacaoService } from './wa-automacao.service';
import { WaTipoAutomacao, WaEstadoInstancia } from '@prisma/client';

// Mock config
vi.mock('../lib/config', () => ({
  config: { FRONTEND_URL: 'https://app.test:5173' }
}));

// Mock n8nApi
vi.mock('../lib/n8nApi', () => ({
  n8nApi: mockN8nApi,
}));

// Mock auditLogService and apiKeysService
vi.mock('./auditLog.service', () => ({
  auditLogService: { log: vi.fn() }
}));

vi.mock('./apikeys.service', () => ({
  apiKeysService: { getOrCreateInternal: vi.fn().mockResolvedValue({ tokenPlain: 'test-api-key' }) }
}));

import { auditLogService } from './auditLog.service';
import { apiKeysService } from './apikeys.service';

describe('waAutomacaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getMockData = (tipo: WaTipoAutomacao = WaTipoAutomacao.LEMBRETE_24H) => ({
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
      estado: WaEstadoInstancia.CONECTADO as WaEstadoInstancia, 
      evolutionName: 'evo-1',
      evolutionToken: 'tok-1',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      numeroTelefone: '123',
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  describe('activar', () => {
    it('deve criar workflow n8n com template correcto por tipo', async () => {
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData(WaTipoAutomacao.LEMBRETE_24H));
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });

      await waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');

      expect(mockN8nApi.criarWorkflow).toHaveBeenCalledWith(WaTipoAutomacao.LEMBRETE_24H, expect.any(Object));
    });

    it('deve guardar n8nWorkflowId e n8nWebhookPath no DB', async () => {
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData());
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
      
      mockN8nApi.criarWorkflow.mockResolvedValue({ workflowId: 'wf-123', webhookPath: '/webhook/test' });

      await waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');

      expect(mockPrisma.waAutomacao.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            n8nWorkflowId: 'wf-123',
            n8nWebhookPath: '/webhook/test',
            ativo: true
          })
        })
      );
    });

    it('deve falhar se instância não está CONECTADA', async () => {
      const mockDisconnected = getMockData();
      mockDisconnected.instancia.estado = WaEstadoInstancia.DESCONECTADO;
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockDisconnected);
      
      await expect(waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1')).rejects.toThrow('Liga o WhatsApp antes de activar automações');
    });

    it('deve gerar/reutilizar API key interna para o n8n', async () => {
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData());
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });

      await waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');

      expect(apiKeysService.getOrCreateInternal).toHaveBeenCalledWith('clinica-1', 'n8n-lembrete_24h');
    });

    it('deve registar auditoria de activação', async () => {
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData());
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });

      await waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accao: 'UPDATE',
          depois: expect.objectContaining({ ativo: true })
        })
      );
    });

    it('deve activar cada um dos 5 tipos de automação sem erro', async () => {
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ slug: 'teste' });
      const tipos = Object.values(WaTipoAutomacao);

      for (const tipo of tipos) {
        mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(getMockData(tipo));
        await expect(waAutomacaoService.activar('aut-1', 'clinica-1', 'user-1')).resolves.not.toThrow();
      }
    });
  });

  describe('desactivar', () => {
    it('deve desactivar workflow no n8n', async () => {
      const mockData = getMockData();
      mockData.n8nWorkflowId = 'wf-123';
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockData);

      await waAutomacaoService.desactivar('aut-1', 'clinica-1', 'user-1');

      expect(mockN8nApi.desactivar).toHaveBeenCalledWith('wf-123');
    });

    it('deve marcar automacao.ativo=false mesmo se n8n estiver em baixo', async () => {
      const mockData = getMockData();
      mockData.n8nWorkflowId = 'wf-123';
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockData);
      
      mockN8nApi.desactivar.mockRejectedValue(new Error('n8n fora do ar'));

      await waAutomacaoService.desactivar('aut-1', 'clinica-1', 'user-1');

      expect(mockPrisma.waAutomacao.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ativo: false } })
      );
    });

    it('deve registar auditoria de desactivação', async () => {
      const mockData = getMockData();
      mockData.n8nWorkflowId = 'wf-123';
      mockPrisma.waAutomacao.findFirstOrThrow.mockResolvedValue(mockData);

      await waAutomacaoService.desactivar('aut-1', 'clinica-1', 'user-1');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accao: 'UPDATE',
          depois: expect.objectContaining({ ativo: false })
        })
      );
    });
  });
});
