import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../test/mocks/prisma.mock';
import { mockEvolutionApi } from '../test/mocks/evolutionApi.mock';
import { WaInstancia, WaEstadoInstancia, WaEstadoConversa, WaDirecao } from '@prisma/client';

// Mock dependências
vi.mock('../lib/evolutionApi', () => ({ evolutionApi: mockEvolutionApi }));
vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('./wa-conversa.service', () => ({ 
  waConversaService: { 
    processarMensagem: vi.fn() 
  } 
}));
vi.mock('./wa-instancia.service', () => ({
  waInstanciaService: {
    processarQrCode: vi.fn(),
    processarConexao: vi.fn(),
    getInstanciaOrThrow: vi.fn()
  }
}));

import { waWebhookService } from './wa-webhook.service';
import { waConversaService } from './wa-conversa.service';
import { waInstanciaService } from './wa-instancia.service';

describe('waWebhookService', () => {
  const instanceName = 'cp-test-prod';
  const instanceId = 'ins-123';
  const clinicaId = 'clinica-1';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.waInstancia.findUnique.mockResolvedValue({
      id: instanceId,
      clinicaId,
      evolutionName: instanceName,
      evolutionToken: 'token-123',
      estado: WaEstadoInstancia.DESCONECTADO,
      numeroTelefone: null,
      qrCodeBase64: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      qrExpiresAt: null,
    } as WaInstancia);
  });

  describe('QRCODE_UPDATED', () => {
    it('deve delegar atualização de QR Code ao waInstanciaService', async () => {
      const payload = {
        event: 'qrcode.updated',
        instance: instanceName,
        data: { qrcode: { base64: 'base64-string' } }
      };

      await waWebhookService.handle(payload.instance, payload.event, payload.data);

      expect(waInstanciaService.processarQrCode).toHaveBeenCalledWith(clinicaId, 'base64-string');
    });
  });

  describe('CONNECTION_UPDATE', () => {
    it('deve delegar atualização de conexão ao waInstanciaService', async () => {
      const payload = {
        event: 'connection.update',
        instance: instanceName,
        data: { state: 'open', number: '244900000000:1@s.whatsapp.net' }
      };

      await waWebhookService.handle(payload.instance, payload.event, payload.data);

      expect(waInstanciaService.processarConexao).toHaveBeenCalledWith(clinicaId, 'open', '244900000000');
    });
  });

  describe('MESSAGES_UPSERT', () => {
    const remoteJid = '244900000000@s.whatsapp.net';
    const cleanNumber = '244900000000';

    it('deve ignorar mensagens enviadas por nós mesmos', async () => {
      const payload = {
        event: 'messages.upsert',
        instance: instanceName,
        data: {
          key: { fromMe: true, remoteJid, id: 'self-msg' },
          message: { conversation: 'teste' }
        }
      };

      await waWebhookService.handle(payload.instance, payload.event, payload.data);

      expect(mockPrisma.waConversa.upsert).not.toHaveBeenCalled();
      expect(waConversaService.processarMensagem).not.toHaveBeenCalled();
    });

    it('deve ignorar mensagens de grupos (@g.us)', async () => {
      const payload = {
        event: 'messages.upsert',
        instance: instanceName,
        data: {
          key: { fromMe: false, remoteJid: '123456@g.us', id: 'group-msg' },
          message: { conversation: 'mensagem do grupo' }
        }
      };

      await waWebhookService.handle(payload.instance, payload.event, payload.data);

      expect(mockPrisma.waConversa.upsert).not.toHaveBeenCalled();
      expect(waConversaService.processarMensagem).not.toHaveBeenCalled();
    });

    it('deve criar/atualizar conversa e chamar o serviço de conversa para mensagens de entrada', async () => {
      const conversationId = 'conv-123';
      
      const mockConversa = {
        id: conversationId,
        instanciaId: instanceId,
        numeroWhatsapp: cleanNumber,
        estado: WaEstadoConversa.AGUARDA_INPUT,
        etapaFluxo: null,
        contexto: null,
        ultimaMensagemEm: new Date(),
        criadoEm: new Date(),
        pacienteId: null,
        instancia: { 
          id: instanceId, 
          clinicaId, 
          evolutionName: instanceName,
          evolutionToken: 'token-123',
          estado: WaEstadoInstancia.CONECTADO,
          numeroTelefone: cleanNumber,
          qrCodeBase64: null,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          qrExpiresAt: null
        }
      };

      mockPrisma.waConversa.upsert.mockResolvedValue(mockConversa);

      const payload = {
        event: 'messages.upsert',
        instance: instanceName,
        data: {
          id: 'msg-abc',
          key: { fromMe: false, remoteJid, id: 'msg-abc' },
          message: { conversation: 'Marcar consulta' },
          pushName: 'João Silva'
        }
      };

      await waWebhookService.handle(payload.instance, payload.event, payload.data);

      expect(mockPrisma.waMensagem.create).toHaveBeenCalledWith({
        data: {
          conversaId: conversationId,
          direcao: WaDirecao.ENTRADA,
          conteudo: 'Marcar consulta',
          evolutionMsgId: 'msg-abc'
        }
      });

      expect(waConversaService.processarMensagem).toHaveBeenCalledWith(
        expect.objectContaining({ id: conversationId }),
        'Marcar consulta'
      );
    });
  });
});
