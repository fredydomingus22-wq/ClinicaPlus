import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { WaInstancia, WaEstadoConversa, WaDirecao } from '@prisma/client';

import { waConversaService } from './wa-conversa.service';
import { waInstanciaService } from './wa-instancia.service';
import { waAutomacaoService } from './wa-automacao.service';

// Webhook interfaces (defined in common types usually, but here for context if needed)
interface MessageUpsertData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

    // 3. Encaminhar para n8n se houver automações activas
    const automacoes = await prisma.waAutomacao.findMany({
      where: { 
        instanciaId: instancia.id,
        ativo: true,
        n8nWebhookUrl: { not: null }
      }
    });

    if (automacoes.length > 0) {
      for (const automacao of automacoes) {
        // Disparamos o webhook no n8n. O waAutomacaoService.dispararWebhook já trata erros e logs.
        waAutomacaoService.dispararWebhook(automacao.id, {
          ...data,
          clinicaId: instancia.clinicaId,
          conversaId: conversa.id,
          tipoAutomacao: automacao.tipo
        }).catch(() => {}); // Fogo e esquece, erros já logados no service
      }
    }

    // 4. Encaminhar para Máquina de Estados interna (Fallback / Auxiliar)
    // Se houver automação de n8n, podemos querer saltar a máquina interna?
    // Por agora mantemos ambas para não quebrar fluxos manuais, mas n8n tem prioridade de execução.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await waConversaService.processarMensagem(conversa as any, conteudo);

    logger.info({ conversaId: conversa.id }, 'Mensagem processada via Webhook');
  },
};
