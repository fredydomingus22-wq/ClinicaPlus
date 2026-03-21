import axios, { AxiosError } from 'axios';
import { config } from './config';
import { AppError } from './AppError';

const evo = axios.create({
  baseURL: config.EVOLUTION_API_URL,
  headers: { apikey: config.EVOLUTION_API_KEY },
  timeout: 15_000,
});

// Interceptor: converter erros da Evolution API em AppError
evo.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    const msg = (err.response?.data as { message?: string })?.message ?? err.message;
    throw new AppError(`Evolution API: ${msg}`, 502, 'EVOLUTION_API_ERROR');
  }
);

export interface EvolutionMessageResponse {
  key: { id: string };
  status: string;
}

/**
 * Cliente para interagir com a Evolution API.
 */
export const evolutionApi = {
  /**
   * Cria uma nova instância na Evolution API.
   */
  async criarInstancia(instanceName: string, webhookUrl: string): Promise<{ instance: { instanceName: string; status: string } }> {
    const { data } = await evo.post('/instance/create', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      },
    });
    return data as { instance: { instanceName: string; status: string } };
  },

  /**
   * Obtém o QR Code em base64 para conexão.
   */
  async obterQrCode(instanceName: string): Promise<{ base64: string; code: string }> {
    const { data } = await evo.get(`/instance/connect/${instanceName}`);
    return data as { base64: string; code: string };
  },

  /**
   * Verifica o estado da conexão da instância.
   */
  async estadoConexao(instanceName: string): Promise<{ instance: { state: 'open' | 'close' | 'connecting' } }> {
    const { data } = await evo.get(`/instance/connectionState/${instanceName}`);
    return data as { instance: { state: 'open' | 'close' | 'connecting' } };
  },

  /**
   * Envia uma mensagem de texto simples.
   */
  async enviarTexto(instanceName: string, numero: string, texto: string): Promise<EvolutionMessageResponse> {
    const { data } = await evo.post(`/message/sendText/${instanceName}`, {
      number: numero,
      text: texto,
      delay: 1200, // simula digitação (ms)
    });
    return data as EvolutionMessageResponse;
  },

  /**
   * Obtém detalhes da instância (incluindo número conectado).
   */
  async obterDetalhes(instanceName: string): Promise<{ number?: string; profileName?: string }> {
    const { data } = await evo.get(`/instance/fetchInstances?instanceName=${instanceName}`);
    const instance = Array.isArray(data) ? data[0] : data.instance || data;
    return {
      number: instance?.owner || instance?.number || instance?.jid?.split('@')[0],
      profileName: instance?.profileName || instance?.name,
    };
  },

  /**
   * Logout da instância.
   */
  async desligar(instanceName: string): Promise<void> {
    await evo.delete(`/instance/logout/${instanceName}`);
  },

  /**
   * Elimina a instância.
   */
  async eliminar(instanceName: string): Promise<void> {
    await evo.delete(`/instance/delete/${instanceName}`);
  },

  /**
   * Actualizar webhook.
   */
  async actualizarWebhook(instanceName: string, webhookUrl: string): Promise<void> {
    await evo.post(`/webhook/set/${instanceName}`, {
      url: webhookUrl,
      byEvents: false,
      base64: false,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
    });
  },
};
