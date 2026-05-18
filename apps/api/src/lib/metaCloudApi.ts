import axios, { AxiosError } from 'axios';
import { config } from './config';
import { AppError } from './AppError';
import { logger } from './logger';
import crypto from 'crypto';

// ─── Tipos internos ─────────────────────────────────────────────────────────

type TextBody = { body: string };
type TemplateParam = { type: 'text'; text: string } | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } };

export interface MetaSendResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status?: string }>;
}

export interface MetaListRow {
  id: string;        // max 200 chars — identificador único da opção
  title: string;     // max 24 chars — texto visível
  description?: string; // max 72 chars
}

export interface MetaListSection {
  title: string;     // max 24 chars
  rows: MetaListRow[];
}

export interface MetaListPayload {
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttonText: string; // texto do botão que abre a lista — max 20 chars
  sections: MetaListSection[];
}

export interface MetaButtonReply {
  id: string;        // max 256 chars
  title: string;     // max 20 chars
}

export interface MetaButtonsPayload {
  bodyText: string;
  footerText?: string;
  buttons: MetaButtonReply[]; // max 3 botões
}

// ─── Factory do cliente Axios (por instância, pois cada uma pode ter o seu token) ─

function buildClient(accessToken: string) {
  return axios.create({
    baseURL: `https://graph.facebook.com/${config.META_GRAPH_VERSION}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 15_000,
  });
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

/**
 * Garante que o número está em formato E.164 sem o '+'.
 * A Meta aceita "5511999999999" (sem '+').
 */
function normalizeNumber(numero: string): string {
  return numero.replace(/^\+/, '').replace(/\s/g, '');
}

// ─── Cliente público ─────────────────────────────────────────────────────────

/**
 * Cliente para a Meta Cloud API (Graph API v23.0).
 * Cada método recebe o phoneNumberId e o accessToken da instância,
 * permitindo que várias clínicas usem as suas próprias credenciais.
 */
export const metaCloudApi = {
  /**
   * Envia uma mensagem de texto simples.
   * Docs: POST /{v}/{phone-number-id}/messages
   */
  async enviarTexto(
    phoneNumberId: string,
    accessToken: string,
    numero: string,
    texto: string,
  ): Promise<MetaSendResponse> {
    const client = buildClient(accessToken);
    try {
      const { data } = await client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizeNumber(numero),
        type: 'text',
        text: { body: texto } satisfies TextBody,
      });
      return data as MetaSendResponse;
    } catch (err) {
      const msg = (err as AxiosError<{ error?: { message?: string } }>)
        .response?.data?.error?.message ?? (err as Error).message;
      throw new AppError(`Meta Cloud API: ${msg}`, 502, 'META_API_ERROR');
    }
  },

  /**
   * Envia um template aprovado pelo Meta.
   * Útil para mensagens de lembrete iniciadas pela clínica (fora da janela de 24h).
   */
  async enviarTemplate(
    phoneNumberId: string,
    accessToken: string,
    numero: string,
    templateName: string,
    languageCode: string,
    params: TemplateParam[],
  ): Promise<MetaSendResponse> {
    const client = buildClient(accessToken);
    try {
      const { data } = await client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizeNumber(numero),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: params.length > 0
            ? [{ type: 'body', parameters: params }]
            : [],
        },
      });
      return data as MetaSendResponse;
    } catch (err) {
      const msg = (err as AxiosError<{ error?: { message?: string } }>)
        .response?.data?.error?.message ?? (err as Error).message;
      throw new AppError(`Meta Cloud API: ${msg}`, 502, 'META_API_ERROR');
    }
  },

  /**
   * Envia uma mensagem interactiva com lista de opções (List Message).
   * Ideal para o menu de marcação: escolha de especialidade, médico ou horário.
   * Limite: 10 secções × 10 rows = 100 opções máximo.
   */
  async enviarInteractivoLista(
    phoneNumberId: string,
    accessToken: string,
    numero: string,
    payload: MetaListPayload,
  ): Promise<MetaSendResponse> {
    const client = buildClient(accessToken);
    try {
      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizeNumber(numero),
        type: 'interactive',
        interactive: {
          type: 'list',
          ...(payload.headerText && {
            header: { type: 'text', text: payload.headerText },
          }),
          body: { text: payload.bodyText },
          ...(payload.footerText && {
            footer: { text: payload.footerText },
          }),
          action: {
            button: payload.buttonText,
            sections: payload.sections,
          },
        },
      };
      const { data } = await client.post(`/${phoneNumberId}/messages`, body);
      return data as MetaSendResponse;
    } catch (err) {
      const msg = (err as AxiosError<{ error?: { message?: string } }>)
        .response?.data?.error?.message ?? (err as Error).message;
      throw new AppError(`Meta Cloud API (lista): ${msg}`, 502, 'META_API_ERROR');
    }
  },

  /**
   * Envia uma mensagem interactiva com botões de resposta rápida (Reply Buttons).
   * Ideal para confirmação/cancelamento de marcação.
   * Limite: máximo 3 botões.
   */
  async enviarInteractivoBotoes(
    phoneNumberId: string,
    accessToken: string,
    numero: string,
    payload: MetaButtonsPayload,
  ): Promise<MetaSendResponse> {
    const client = buildClient(accessToken);
    try {
      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizeNumber(numero),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: payload.bodyText },
          ...(payload.footerText && {
            footer: { text: payload.footerText },
          }),
          action: {
            buttons: payload.buttons.map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title },
            })),
          },
        },
      };
      const { data } = await client.post(`/${phoneNumberId}/messages`, body);
      return data as MetaSendResponse;
    } catch (err) {
      const msg = (err as AxiosError<{ error?: { message?: string } }>)
        .response?.data?.error?.message ?? (err as Error).message;
      throw new AppError(`Meta Cloud API (botões): ${msg}`, 502, 'META_API_ERROR');
    }
  },

  /**
   * Marca uma mensagem como lida (envia read receipt).
   * Boa prática: chamar após processar cada mensagem do utilizador.
   */
  async marcarComoLido(
    phoneNumberId: string,
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    const client = buildClient(accessToken);
    try {
      await client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (err) {
      // Não bloquear o fluxo por falha no read receipt
      logger.warn({ messageId, err }, 'Falha ao marcar mensagem como lida — ignorado');
    }
  },

  /**
   * Verifica a assinatura HMAC-SHA256 do webhook da Meta.
   * A Meta envia `X-Hub-Signature-256: sha256=<hash>` em cada POST.
   * @throws AppError 401 se a assinatura for inválida.
   */
  verificarAssinaturaWebhook(rawBody: Buffer, signature: string): void {
    const appSecret = config.META_APP_SECRET;
    if (!appSecret) {
      logger.warn('META_APP_SECRET não configurado — a saltar verificação de assinatura');
      return;
    }

    const expected = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    // Comparação segura contra timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw new AppError('Assinatura do webhook Meta inválida.', 401, 'META_WEBHOOK_INVALID_SIG');
    }
  },

  /**
   * Responde ao challenge de verificação do webhook Meta.
   * A Meta faz GET com hub.mode, hub.verify_token e hub.challenge.
   */
  responderChallenge(mode: string, token: string, challenge: string): string {
    const verifyToken = config.META_VERIFY_TOKEN;
    if (!verifyToken) {
      throw new AppError('META_VERIFY_TOKEN não configurado.', 500, 'META_CONFIG_ERROR');
    }
    if (mode !== 'subscribe' || token !== verifyToken) {
      throw new AppError('Token de verificação do webhook Meta inválido.', 403, 'META_WEBHOOK_FORBIDDEN');
    }
    return challenge;
  },
};
