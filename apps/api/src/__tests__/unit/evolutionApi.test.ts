import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evolutionApi } from '../../lib/evolutionApi';
import axios from 'axios';

// Mock do axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn().mockReturnThis(),
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('EvolutionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarInstancia', () => {
    it('deve chamar o endpoint correcto para criar uma instância', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { hash: 'abc', instance: { instanceName: 'inst-1', status: 'created' } }
      });

      const result = await evolutionApi.criarInstancia('inst-1', 'http://webhook.test');

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/instance/create'),
        expect.objectContaining({
          instanceName: 'inst-1',
          webhook: expect.objectContaining({ url: 'http://webhook.test' })
        })
      );
      
      expect(result).toMatchObject({ instanceName: 'inst-1' });
    });
  });

  describe('obterQrCode', () => {
    it('deve retornar o base64 do QR code', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: { base64: 'data:image/png;base64,...' }
      });

      const result = await evolutionApi.obterQrCode('inst-1');
      expect(result).toEqual({ base64: 'data:image/png;base64,...' });
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/instance/connect/inst-1')
      );
    });
  });

  describe('enviarTexto', () => {
    it('deve enviar mensagem de texto para o número especificado', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { key: { id: 'msg-1', remoteJid: '244923456789@s.whatsapp.net', fromMe: true }, status: 'PENDING', messageTimestamp: 123 }
      });

      const result = await evolutionApi.enviarTexto('inst-1', '244923456789', 'Olá mundo');

      expect(axios.post).toHaveBeenCalledWith(
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
