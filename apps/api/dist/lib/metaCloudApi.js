"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaCloudApi = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const AppError_1 = require("./AppError");
const logger_1 = require("./logger");
const crypto_1 = __importDefault(require("crypto"));
// ─── Factory do cliente Axios (por instância, pois cada uma pode ter o seu token) ─
function buildClient(accessToken) {
    return axios_1.default.create({
        baseURL: `https://graph.facebook.com/${config_1.config.META_GRAPH_VERSION}`,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        timeout: 15000,
    });
}
// ─── Utilidades ─────────────────────────────────────────────────────────────
/**
 * Garante que o número está em formato E.164 sem o '+'.
 * A Meta aceita "5511999999999" (sem '+').
 */
function normalizeNumber(numero) {
    return numero.replace(/^\+/, '').replace(/\s/g, '');
}
// ─── Cliente público ─────────────────────────────────────────────────────────
/**
 * Cliente para a Meta Cloud API (Graph API v23.0).
 * Cada método recebe o phoneNumberId e o accessToken da instância,
 * permitindo que várias clínicas usem as suas próprias credenciais.
 */
exports.metaCloudApi = {
    /**
     * Envia uma mensagem de texto simples.
     * Docs: POST /{v}/{phone-number-id}/messages
     */
    async enviarTexto(phoneNumberId, accessToken, numero, texto) {
        const client = buildClient(accessToken);
        try {
            const { data } = await client.post(`/${phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: normalizeNumber(numero),
                type: 'text',
                text: { body: texto },
            });
            return data;
        }
        catch (err) {
            const msg = err
                .response?.data?.error?.message ?? err.message;
            throw new AppError_1.AppError(`Meta Cloud API: ${msg}`, 502, 'META_API_ERROR');
        }
    },
    /**
     * Envia um template aprovado pelo Meta.
     * Útil para mensagens de lembrete iniciadas pela clínica (fora da janela de 24h).
     */
    async enviarTemplate(phoneNumberId, accessToken, numero, templateName, languageCode, params) {
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
            return data;
        }
        catch (err) {
            const msg = err
                .response?.data?.error?.message ?? err.message;
            throw new AppError_1.AppError(`Meta Cloud API: ${msg}`, 502, 'META_API_ERROR');
        }
    },
    /**
     * Envia uma mensagem interactiva com lista de opções (List Message).
     * Ideal para o menu de marcação: escolha de especialidade, médico ou horário.
     * Limite: 10 secções × 10 rows = 100 opções máximo.
     */
    async enviarInteractivoLista(phoneNumberId, accessToken, numero, payload) {
        const client = buildClient(accessToken);
        try {
            const body = {
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
            return data;
        }
        catch (err) {
            const msg = err
                .response?.data?.error?.message ?? err.message;
            throw new AppError_1.AppError(`Meta Cloud API (lista): ${msg}`, 502, 'META_API_ERROR');
        }
    },
    /**
     * Envia uma mensagem interactiva com botões de resposta rápida (Reply Buttons).
     * Ideal para confirmação/cancelamento de marcação.
     * Limite: máximo 3 botões.
     */
    async enviarInteractivoBotoes(phoneNumberId, accessToken, numero, payload) {
        const client = buildClient(accessToken);
        try {
            const body = {
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
            return data;
        }
        catch (err) {
            const msg = err
                .response?.data?.error?.message ?? err.message;
            throw new AppError_1.AppError(`Meta Cloud API (botões): ${msg}`, 502, 'META_API_ERROR');
        }
    },
    /**
     * Marca uma mensagem como lida (envia read receipt).
     * Boa prática: chamar após processar cada mensagem do utilizador.
     */
    async marcarComoLido(phoneNumberId, accessToken, messageId) {
        const client = buildClient(accessToken);
        try {
            await client.post(`/${phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            });
        }
        catch (err) {
            // Não bloquear o fluxo por falha no read receipt
            logger_1.logger.warn({ messageId, err }, 'Falha ao marcar mensagem como lida — ignorado');
        }
    },
    /**
     * Verifica a assinatura HMAC-SHA256 do webhook da Meta.
     * A Meta envia `X-Hub-Signature-256: sha256=<hash>` em cada POST.
     * @throws AppError 401 se a assinatura for inválida.
     */
    verificarAssinaturaWebhook(rawBody, signature) {
        const appSecret = config_1.config.META_APP_SECRET;
        if (!appSecret) {
            logger_1.logger.warn('META_APP_SECRET não configurado — a saltar verificação de assinatura');
            return;
        }
        const expected = 'sha256=' + crypto_1.default
            .createHmac('sha256', appSecret)
            .update(rawBody)
            .digest('hex');
        // Comparação segura contra timing attacks
        if (!crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
            throw new AppError_1.AppError('Assinatura do webhook Meta inválida.', 401, 'META_WEBHOOK_INVALID_SIG');
        }
    },
    /**
     * Responde ao challenge de verificação do webhook Meta.
     * A Meta faz GET com hub.mode, hub.verify_token e hub.challenge.
     */
    responderChallenge(mode, token, challenge) {
        const verifyToken = config_1.config.META_VERIFY_TOKEN;
        if (!verifyToken) {
            throw new AppError_1.AppError('META_VERIFY_TOKEN não configurado.', 500, 'META_CONFIG_ERROR');
        }
        if (mode !== 'subscribe' || token !== verifyToken) {
            throw new AppError_1.AppError('Token de verificação do webhook Meta inválido.', 403, 'META_WEBHOOK_FORBIDDEN');
        }
        return challenge;
    },
};
