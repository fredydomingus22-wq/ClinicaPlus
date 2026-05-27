"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waMetaWebhookService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const metaCloudApi_1 = require("../lib/metaCloudApi");
const secretCrypto_1 = require("../lib/secretCrypto");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
// ─── Serviço ────────────────────────────────────────────────────────────────
/**
 * Processa webhooks recebidos directamente da Meta Cloud API.
 * A verificação de assinatura deve ter sido feita ANTES de chamar este serviço
 * (no middleware da rota).
 */
exports.waMetaWebhookService = {
    /**
     * Ponto de entrada: itera todos os entries/changes do payload.
     */
    async handle(payload) {
        for (const entry of payload.entry) {
            for (const change of entry.changes) {
                if (change.field !== 'messages')
                    continue;
                await this.processarChange(change.value).catch((err) => logger_1.logger.error({ err, wabaId: entry.id }, 'Erro ao processar change Meta webhook'));
            }
        }
    },
    /**
     * Processa um único change.value — pode conter mensagens ou status updates.
     */
    async processarChange(value) {
        const phoneNumberId = value.metadata.phone_number_id;
        // Encontrar a instância pelo metaPhoneNumberId
        const instancia = await prisma_1.prisma.waInstancia.findFirst({
            where: { metaPhoneNumberId: phoneNumberId, tipoIntegracao: 'META_CLOUD' },
        });
        if (!instancia) {
            logger_1.logger.warn({ phoneNumberId }, 'Nenhuma instância META_CLOUD encontrada para este Phone Number ID');
            return;
        }
        // Processar status updates (delivered/read) — só log por agora
        if (value.statuses?.length) {
            for (const status of value.statuses) {
                logger_1.logger.info({ instanciaId: instancia.id, msgId: status.id, status: status.status }, 'Status de mensagem Meta actualizado');
                // Actualizar entregue/lida na BD se existir
                await this.actualizarStatusMensagem(status).catch(() => { });
            }
        }
        // Processar mensagens recebidas
        if (value.messages?.length) {
            const nomeContacto = value.contacts?.[0]?.profile?.name;
            for (const msg of value.messages) {
                await this.processarMensagem(instancia, msg, nomeContacto).catch((err) => logger_1.logger.error({ err, msgId: msg.id }, 'Erro ao processar mensagem Meta'));
            }
        }
    },
    /**
     * Processa uma mensagem recebida individualmente.
     */
    async processarMensagem(instancia, msg, nomeContacto) {
        const numeroWhatsapp = msg.from; // já vem sem '+'
        // Enviar read receipt (boas práticas Meta)
        if (instancia.metaPhoneNumberId && instancia.metaAccessToken) {
            await metaCloudApi_1.metaCloudApi
                .marcarComoLido(instancia.metaPhoneNumberId, (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken), msg.id)
                .catch(() => { });
        }
        // Extrair conteúdo textual
        let conteudo = '[Media/Outro]';
        if (msg.type === 'text' && msg.text?.body) {
            conteudo = msg.text.body;
        }
        else if (msg.type === 'interactive') {
            if (msg.interactive?.type === 'list_reply' && msg.interactive.list_reply) {
                conteudo = `[LIST_REPLY:${msg.interactive.list_reply.id}]`;
            }
            else if (msg.interactive?.type === 'button_reply' && msg.interactive.button_reply) {
                conteudo = `[BUTTON_REPLY:${msg.interactive.button_reply.id}]`;
            }
        }
        // Upsert da conversa
        const conversa = await prisma_1.prisma.waConversa.upsert({
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
                estado: client_1.WaEstadoConversa.AGUARDA_INPUT,
                ultimaMensagemEm: new Date(),
            },
            update: {
                ultimaMensagemEm: new Date(),
            },
        });
        // Persistir mensagem
        await prisma_1.prisma.waMensagem.create({
            data: {
                conversaId: conversa.id,
                conteudo,
                direcao: client_1.WaDirecao.ENTRADA,
                evolutionMsgId: msg.id, // reutilizar campo para o wamid Meta
                tipo: msg.type,
            },
        });
        logger_1.logger.info({ conversaId: conversa.id, tipo: msg.type, numero: numeroWhatsapp }, 'Mensagem Meta processada');
        // Montar Schema Unificado (ClinicaMessage)
        const clinicaMessage = {
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
            await axios_1.default.post(`${INTEL_URL}/webhook/unified`, clinicaMessage);
            logger_1.logger.info({ clinicaMessage }, 'Mensagem reencaminhada para a ClinicaPlus Intelligence');
        }
        catch (apiErr) {
            logger_1.logger.error({ apiErr }, 'Erro ao encaminhar mensagem para ClinicaPlus Intelligence (FastAPI)');
        }
    },
    /**
     * Actualiza o estado de entrega/leitura de uma mensagem na BD.
     */
    async actualizarStatusMensagem(status) {
        if (status.status === 'delivered') {
            await prisma_1.prisma.waMensagem.updateMany({
                where: { evolutionMsgId: status.id },
                data: { entregue: true },
            });
        }
        else if (status.status === 'read') {
            await prisma_1.prisma.waMensagem.updateMany({
                where: { evolutionMsgId: status.id },
                data: { entregue: true, lida: true },
            });
        }
    },
};
