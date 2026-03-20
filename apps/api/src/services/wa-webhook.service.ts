import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { WaInstancia, WaEstadoConversa, WaDirecao } from '@prisma/client';

import { waConversaService } from './wa-conversa.service';
import { waInstanciaService } from './wa-instancia.service';

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
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
export const waWebhookService = {
  /**
   * Ponto de entrada para todos os eventos da Evolution API.
   */
  async processarEvento(payload: EvolutionWebhookPayload): Promise<void> {
    const { event, instance, data } = payload;
    logger.info({ event, instance }, 'Webhook recebido');

    // 2. Encaminhar para handlers baseados no nome da instância
    switch (event) {
      case 'qrcode.updated':
        await this.handleQrCodeUpdated(instance, data as QrCodeUpdatedData);
        break;
      case 'connection.update':
        await this.handleConnectionUpdate(instance, data as ConnectionUpdateData);
        break;
      case 'messages.upsert': {
        // Mensagens precisam do objecto Instância para contexto de clínica/paciente
        const instanciaAtiva = await prisma.waInstancia.findUnique({
          where: { evolutionName: instance },
        });
        if (instanciaAtiva) {
          await this.handleMessageUpsert(instanciaAtiva, data as MessageUpsertData);
        }
        break;
      }
      default:
        logger.debug({ event }, 'Evento ignorado');
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

    // 3. Encaminhar para Máquina de Estados (waConversaService)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await waConversaService.processarMensagem(conversa as any, conteudo);

    logger.info({ conversaId: conversa.id }, 'Mensagem processada via Webhook');
  },
};
