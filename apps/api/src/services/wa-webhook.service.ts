import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { WaInstancia, WaEstadoConversa, WaDirecao } from '@prisma/client';

import axios from 'axios';
import { waInstanciaService } from './wa-instancia.service';
import { waAutomacaoService } from './wa-automacao.service';
import { ClinicaMessageDTO } from '@clinicaplus/types';

// Webhook interfaces (defined in common types usually, but here for context if needed)
interface MessageUpsertData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  pushName?: string;
}

interface QrCodeUpdatedData {
  qrcode: {
    base64: string;
  };
}

interface ConnectionUpdateData {
  state: string;
  number?: string;
}

/**
 * Serviço para processamento de webhooks da Evolution API.
 */
const CACHE_PREFIX = 'wa:instance:';
const CACHE_TTL = 3600; // 1 hora

export const waWebhookService = {
  /**
   * Ponto de entrada para todos os eventos da Evolution API.
   */
  async handle(instance: string, event: string, data: unknown): Promise<void> {
    logger.debug({ instance, event }, 'Processando Webhook Evolution API');

    switch (event) {
      case 'qrcode.updated':
        await this.handleQrCodeUpdated(instance, data as QrCodeUpdatedData);
        break;
      case 'connection.update':
        await this.handleConnectionUpdate(instance, data as ConnectionUpdateData);
        break;
      case 'messages.upsert': {
        // 1. Tentar obter instância (com cache Redis)
        const cacheKey = `${CACHE_PREFIX}${instance}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let instancia: any = null;

        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            instancia = JSON.parse(cached);
          }
        } catch (err) {
          logger.error({ instance, err }, 'Erro ao ler cache do Redis');
        }

        if (!instancia) {
          instancia = await prisma.waInstancia.findUnique({
            where: { evolutionName: instance },
          });

          if (instancia) {
            try {
              await redis.set(cacheKey, JSON.stringify(instancia), 'EX', CACHE_TTL);
            } catch (err) {
              logger.error({ instance, err }, 'Erro ao gravar no Redis');
            }
          }
        }

        if (instancia) {
          await this.handleMessageUpsert(instancia, data as MessageUpsertData);
        }
        break;
      }
      default:
        break;
    }
  },

  /**
   * Actualiza o QR Code da instância.
   */
  async handleQrCodeUpdated(evolutionName: string, data: QrCodeUpdatedData): Promise<void> {
    await waInstanciaService.processarQrCode(evolutionName, data.qrcode.base64);
  },

  /**
   * Actualiza o estado da conexão da instância.
   */
  async handleConnectionUpdate(evolutionName: string, data: ConnectionUpdateData): Promise<void> {
    const { state, number } = data;
    const numeroTelefone = number ? number.split(':')[0] : undefined;
    
    await waInstanciaService.processarConexao(evolutionName, state, numeroTelefone);
  },

  /**
   * Processa mensagens de entrada e encaminha para a máquina de estados.
   */
  async handleMessageUpsert(instancia: WaInstancia, data: MessageUpsertData): Promise<void> {
    const { key, message } = data;
    
    // Ignorar se não for mensagem de chat ou for nossa
    const remoteJid = key?.remoteJid;
    if (!message || !remoteJid || remoteJid.includes('@g.us') || key.fromMe) {
      return;
    }

    const numeroWhatsapp = remoteJid.split('@')[0]!;
    const conteudo = message.conversation || 
                  message.extendedTextMessage?.text || 
                  '[Media/Outro]';

    // 1. Criar/Actualizar Conversa
    const conversa = await prisma.waConversa.upsert({
      where: {
        instanciaId_numeroWhatsapp: {
          instanciaId: instancia.id,
          numeroWhatsapp,
        },
      },
      create: {
        clinicaId: instancia.clinicaId,
        instanciaId: instancia.id,
        numeroWhatsapp,
        estado: WaEstadoConversa.AGUARDA_INPUT,
      },
      update: {
        ultimaMensagemEm: new Date(),
      },
      include: { instancia: true },
    });

    // 2. Persistir Mensagem
    await prisma.waMensagem.create({
      data: {
        conversaId: conversa.id,
        conteudo,
        direcao: WaDirecao.ENTRADA,
        evolutionMsgId: key.id,
      },
    });

    // 3. Montar Schema Unificado (ClinicaMessage)
    const clinicaMessage: ClinicaMessageDTO = {
      clinicaId: instancia.clinicaId,
      instanciaId: instancia.id,
      channel: 'BAILEYS',
      telefone: numeroWhatsapp,
      nomeContato: data.pushName || 'Contato',
      messageType: 'TEXT', // O Evolution (na nossa abstração actual) envia quase tudo como TEXT ou media-text
      value: conteudo,
      messageId: key.id,
      timestamp: new Date().getTime().toString(),
    };

    // 4. Verificação de Conflito com Bots Externos (Typebot, Dialogflow, N8N)
    // Se a instância tiver um bot externo ativo, a Evolution API já o está a executar nativamente!
    // Não devemos enviar o Payload para o Langgraph (Intel), senão teríamos 2 IAs a responder.
    const botAtivo = await prisma.botIntegracao.findFirst({
      where: { instanciaId: instancia.id, ativo: true }
    });

    if (botAtivo) {
      logger.info({ conversaId: conversa.id }, 'Mensagem guardada; não enviada à Intel porque há um Bot Externo (Typebot/N8N) ativo nesta instância.');
      return;
    }

    // 5. Encaminhar para o FastAPI (Intent Router / Agente)
    const INTEL_URL = process.env.INTEL_SERVICE_URL || 'http://localhost:8001';
    try {
      await axios.post(`${INTEL_URL}/webhook/unified`, clinicaMessage);
      logger.info({ clinicaMessage }, 'Mensagem Evolution reencaminhada para a ClinicaPlus Intelligence');
    } catch (apiErr) {
      logger.error({ apiErr }, 'Erro ao encaminhar mensagem para ClinicaPlus Intelligence (FastAPI)');
    }

    logger.info({ conversaId: conversa.id }, 'Mensagem recebida do Webhook Evolution normalizada');
  },
};
