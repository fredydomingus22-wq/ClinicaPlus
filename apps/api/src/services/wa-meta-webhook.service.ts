import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { metaCloudApi } from '../lib/metaCloudApi';
import { WaEstadoConversa, WaDirecao, WaInstancia } from '@prisma/client';
import axios from 'axios';
import { ClinicaMessageDTO } from '@clinicaplus/types';
// ─── Tipos do payload da Meta Cloud API ────────────────────────────────────

interface MetaMessageText {
  body: string;
}

interface MetaInteractiveListReply {
  id: string;
  title: string;
  description?: string;
}

interface MetaInteractiveButtonReply {
  id: string;
  title: string;
}

interface MetaInteractive {
  type: 'list_reply' | 'button_reply';
  list_reply?: MetaInteractiveListReply;
  button_reply?: MetaInteractiveButtonReply;
}

interface MetaMessage {
  id: string;              // wamid.xxx
  from: string;            // número do remetente (sem '+')
  type: 'text' | 'interactive' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'sticker' | 'reaction' | 'unsupported';
  timestamp: string;
  text?: MetaMessageText;
  interactive?: MetaInteractive;
}

interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

interface MetaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

interface MetaChangeValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
  errors?: Array<{ code: number; title: string; message: string }>;
}

interface MetaChange {
  field: 'messages';
  value: MetaChangeValue;
}

interface MetaEntry {
  id: string; // WABA ID
  changes: MetaChange[];
}

export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: MetaEntry[];
}

// ─── Serviço ────────────────────────────────────────────────────────────────

/**
 * Processa webhooks recebidos directamente da Meta Cloud API.
 * A verificação de assinatura deve ter sido feita ANTES de chamar este serviço
 * (no middleware da rota).
 */
export const waMetaWebhookService = {
  /**
   * Ponto de entrada: itera todos os entries/changes do payload.
   */
  async handle(payload: MetaWebhookPayload): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;
        await this.processarChange(change.value).catch((err) =>
          logger.error({ err, wabaId: entry.id }, 'Erro ao processar change Meta webhook'),
        );
      }
    }
  },

  /**
   * Processa um único change.value — pode conter mensagens ou status updates.
   */
  async processarChange(value: MetaChangeValue): Promise<void> {
    const phoneNumberId = value.metadata.phone_number_id;

    // Encontrar a instância pelo metaPhoneNumberId
    const instancia = await prisma.waInstancia.findFirst({
      where: { metaPhoneNumberId: phoneNumberId, tipoIntegracao: 'META_CLOUD' },
    });

    if (!instancia) {
      logger.warn({ phoneNumberId }, 'Nenhuma instância META_CLOUD encontrada para este Phone Number ID');
      return;
    }

    // Processar status updates (delivered/read) — só log por agora
    if (value.statuses?.length) {
      for (const status of value.statuses) {
        logger.info(
          { instanciaId: instancia.id, msgId: status.id, status: status.status },
          'Status de mensagem Meta actualizado',
        );
        // Actualizar entregue/lida na BD se existir
        await this.actualizarStatusMensagem(status).catch(() => {});
      }
    }

    // Processar mensagens recebidas
    if (value.messages?.length) {
      const nomeContacto = value.contacts?.[0]?.profile?.name;
      for (const msg of value.messages) {
        await this.processarMensagem(instancia, msg, nomeContacto).catch((err) =>
          logger.error({ err, msgId: msg.id }, 'Erro ao processar mensagem Meta'),
        );
      }
    }
  },

  /**
   * Processa uma mensagem recebida individualmente.
   */
  async processarMensagem(
    instancia: WaInstancia,
    msg: MetaMessage,
    nomeContacto?: string,
  ): Promise<void> {
    const numeroWhatsapp = msg.from; // já vem sem '+'

    // Enviar read receipt (boas práticas Meta)
    if (instancia.metaPhoneNumberId && instancia.metaAccessToken) {
      await metaCloudApi
        .marcarComoLido(instancia.metaPhoneNumberId, instancia.metaAccessToken, msg.id)
        .catch(() => {});
    }

    // Extrair conteúdo textual
    let conteudo = '[Media/Outro]';
    if (msg.type === 'text' && msg.text?.body) {
      conteudo = msg.text.body;
    } else if (msg.type === 'interactive') {
      if (msg.interactive?.type === 'list_reply' && msg.interactive.list_reply) {
        conteudo = `[LIST_REPLY:${msg.interactive.list_reply.id}]`;
      } else if (msg.interactive?.type === 'button_reply' && msg.interactive.button_reply) {
        conteudo = `[BUTTON_REPLY:${msg.interactive.button_reply.id}]`;
      }
    }

    // Upsert da conversa
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
        ultimaMensagemEm: new Date(),
      },
      update: {
        ultimaMensagemEm: new Date(),
      },
    });

    // Persistir mensagem
    await prisma.waMensagem.create({
      data: {
        conversaId: conversa.id,
        conteudo,
        direcao: WaDirecao.ENTRADA,
        evolutionMsgId: msg.id, // reutilizar campo para o wamid Meta
        tipo: msg.type,
      },
    });

    logger.info(
      { conversaId: conversa.id, tipo: msg.type, numero: numeroWhatsapp },
      'Mensagem Meta processada',
    );

    // Montar Schema Unificado (ClinicaMessage)
    const clinicaMessage: ClinicaMessageDTO = {
      clinicaId: instancia.clinicaId,
      instanciaId: instancia.id,
      channel: 'META_CLOUD',
      telefone: numeroWhatsapp,
      nomeContato: nomeContacto || 'Contato Meta',
      messageType: msg.type === 'interactive' ? 'INTERACTIVE_REPLY' : (msg.type === 'text' ? 'TEXT' : 'UNKNOWN'),
      value: conteudo,
      messageId: msg.id,
      timestamp: msg.timestamp || new Date().getTime().toString(),
    };

    // Encaminhar para o FastAPI (Intent Router / Agente)
    const INTEL_URL = process.env.INTEL_SERVICE_URL || 'http://localhost:8001';
    try {
      await axios.post(`${INTEL_URL}/webhook/unified`, clinicaMessage);
      logger.info({ clinicaMessage }, 'Mensagem reencaminhada para a ClinicaPlus Intelligence');
    } catch (apiErr) {
      logger.error({ apiErr }, 'Erro ao encaminhar mensagem para ClinicaPlus Intelligence (FastAPI)');
    }
  },

  /**
   * Actualiza o estado de entrega/leitura de uma mensagem na BD.
   */
  async actualizarStatusMensagem(status: MetaStatus): Promise<void> {
    if (status.status === 'delivered') {
      await prisma.waMensagem.updateMany({
        where: { evolutionMsgId: status.id },
        data: { entregue: true },
      });
    } else if (status.status === 'read') {
      await prisma.waMensagem.updateMany({
        where: { evolutionMsgId: status.id },
        data: { entregue: true, lida: true },
      });
    }
  },
};
