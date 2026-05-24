import { describe, it, expect, vi, beforeEach } from 'vitest';

const evoInstance = {
  interceptors: { response: { use: vi.fn() } },
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => evoInstance),
  },
}));

import { evolutionApi } from '../../lib/evolutionApi';

describe('EvolutionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarInstancia', () => {
    it('deve chamar o endpoint correcto para criar uma instância', async () => {
      evoInstance.post.mockResolvedValueOnce({
        data: { hash: 'abc', instance: { instanceName: 'inst-1', status: 'created' } }
      });

      const result = await evolutionApi.criarInstancia('inst-1', 'http://webhook.test');

      expect(evoInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/instance/create'),
        expect.objectContaining({
          instanceName: 'inst-1',
          webhook: expect.objectContaining({ url: 'http://webhook.test' })
        })
      );
      
      expect(result).toMatchObject({ instance: { instanceName: 'inst-1' } });
    });
  });

  describe('obterQrCode', () => {
    it('deve retornar o base64 do QR code', async () => {
      evoInstance.get.mockResolvedValueOnce({
        data: { base64: 'data:image/png;base64,...' }
      });

      const result = await evolutionApi.obterQrCode('inst-1');
      expect(result).toEqual({ base64: 'data:image/png;base64,...' });
      expect(evoInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/instance/connect/inst-1')
      );
    });
  });

  describe('enviarTexto', () => {
    it('deve enviar mensagem de texto para o número especificado', async () => {
      evoInstance.post.mockResolvedValueOnce({
        data: { key: { id: 'msg-1', remoteJid: '244923456789@s.whatsapp.net', fromMe: true }, status: 'PENDING', messageTimestamp: 123 }
      });

      const result = await evolutionApi.enviarTexto('inst-1', '244923456789', 'Olá mundo');

      expect(evoInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/message/sendText/inst-1'),
        expect.objectContaining({
          number: '244923456789',
          text: 'Olá mundo'
        })
      );
      expect(result.key.id).toBe('msg-1');
    });
  });
});
