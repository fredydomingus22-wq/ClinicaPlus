// 1. Mock do config ANTES de importar o evolutionApi
vi.mock('./config', () => ({
  config: {
    EVOLUTION_API_URL: 'https://evo-test.ao',
    EVOLUTION_API_KEY: 'test-key',
  }
}));

import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest';
import axios from 'axios';

// 2. Mock do axios com suporte para .create() no topo do ficheiro
vi.mock('axios', () => {
  const mAxios = {
    create: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  };
  mAxios.create.mockReturnValue(mAxios);
  return {
    default: mAxios,
    ...mAxios
  };
});

const mockedAxios = axios as Mocked<typeof axios>;
import { evolutionApi } from './evolutionApi';

describe('evolutionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarInstancia', () => {
    it('deve fazer POST /instance/create com parâmetros correctos', async () => {
      const mockResponse = { 
        instance: { instanceName: 'cp-test', status: 'created' } 
      };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await evolutionApi.criarInstancia('cp-test', 'https://webhook.test');

      expect(mockedAxios.post).toHaveBeenCalledWith('/instance/create', {
        instanceName: 'cp-test',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: 'https://webhook.test',
          byEvents: false,
          base64: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
        },
      });
      // Na spec atual, o retorno é o objeto 'data' completo
      expect(result).toEqual(mockResponse);
    });

    it('deve lançar erro se Evolution API retornar 4xx', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Invalid name' } }
      });

      await expect(evolutionApi.criarInstancia('invalid', 'url')).rejects.toThrow();
    });
  });

  describe('enviarTexto', () => {
    it('deve fazer POST /message/sendText/{instanceName}', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { key: { id: 'msg-1' } } });

      await evolutionApi.enviarTexto('cp-test', '244900000000', 'Olá');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/message/sendText/cp-test',
        expect.objectContaining({
          number: '244900000000',
          text: 'Olá'
        })
      );
    });

    it('deve incluir delay de 1200ms', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { key: { id: 'msg-1' } } });

      await evolutionApi.enviarTexto('cp-test', '244900000000', 'Olá');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          delay: 1200
        })
      );
    });
  });

  describe('estadoConexao', () => {
    it('deve retornar estado "open" quando conectado', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { state: 'open' } });

      const result = await evolutionApi.estadoConexao('cp-test');

      expect(mockedAxios.get).toHaveBeenCalledWith('/instance/connectionState/cp-test');
      expect(result.state).toBe('open');
    });
  });
});
