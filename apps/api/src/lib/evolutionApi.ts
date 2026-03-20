import axios from 'axios';
import { config } from './config';

const evo = axios.create({
  baseURL: config.EVOLUTION_API_URL,
  headers: { apikey: config.EVOLUTION_API_KEY },
  timeout: 15_000,
});

export interface EvolutionMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: unknown;
  messageTimestamp: number;
  status: string;
}

/**
 * Cliente para interagir com a Evolution API.
 * Documentação: https://doc.evolution-api.com/
 */
export const evolutionApi = {
  /**
   * Helper para construir URLs da Evolution API (redundante com axios baseURL mas exigido por refactor).
   */
  makeEvoUrl(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  },

  /**
   * Cria uma nova instância na Evolution API.
   * @param instanceName Nome da instância a criar (ex: cp-abc-prod)
   * @param webhookUrl URL para receber eventos
   */
  async criarInstancia(instanceName: string, webhookUrl: string): Promise<unknown> {
    const { data } = await evo.post(this.makeEvoUrl('/instance/create'), {
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
    return data;
  },

  /**
   * Obtém o QR Code em base64 para conexão.
   * @param instanceName Nome da instância
   */
  async obterQrCode(instanceName: string): Promise<{ base64: string }> {
    const { data } = await evo.get(this.makeEvoUrl(`/instance/connect/${instanceName}`));
    // Evolution API v2 aninha em 'qrcode' ou retorna o campo base64
    const base64 = data.base64 || data.qrcode?.base64 || data.instance?.qrcode?.base64;
    return { base64 };
  },

  /**
   * Verifica o estado da conexão da instância.
   * @param instanceName Nome da instância
   */
  async estadoConexao(instanceName: string): Promise<{ state: string }> {
    const { data } = await evo.get(this.makeEvoUrl(`/instance/connectionState/${instanceName}`));
    // Evolution API v2 aninha em 'instance'
    const state = data.instance?.state || data.state || 'close';
    return { state };
  },

  /**
   * Envia uma mensagem de texto simples.
   * @param instanceName Nome da instância
   * @param numero Número do destinatário (com código de país)
   * @param texto Conteúdo da mensagem
   */
  async enviarTexto(instanceName: string, numero: string, texto: string): Promise<EvolutionMessageResponse> {
    const { data } = await evo.post(this.makeEvoUrl(`/message/sendText/${instanceName}`), {
      number: numero,
      text: texto,
      delay: 1200,  // simula digitação (ms) — melhor UX
    });
    return data as EvolutionMessageResponse;
  },

  /**
   * Obtém detalhes da instância (incluindo número conectado).
   * @param instanceName Nome da instância
   */
  async obterDetalhes(instanceName: string): Promise<{ number?: string; profileName?: string }> {
    const { data } = await evo.get(this.makeEvoUrl(`/instance/fetchInstances?instanceName=${instanceName}`));
    // Evolution v2 retorna um array ou objeto
    const instance = Array.isArray(data) ? data[0] : data.instance || data;
    return {
      number: instance?.owner || instance?.number || instance?.jid?.split('@')[0],
      profileName: instance?.profileName || instance?.name,
    };
  },

  /**
   * Desliga a instância (logout).
   * @param instanceName Nome da instância
   */
  async desligar(instanceName: string): Promise<void> {
    await evo.delete(this.makeEvoUrl(`/instance/logout/${instanceName}`));
  },

  /**
   * Elimina a instância da Evolution API.
   * @param instanceName Nome da instância
   */
  async eliminar(instanceName: string): Promise<void> {
    await evo.delete(this.makeEvoUrl(`/instance/delete/${instanceName}`));
  },
};
