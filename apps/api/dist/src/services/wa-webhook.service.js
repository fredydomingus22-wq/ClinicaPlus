"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waWebhookService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const redis_1 = require("../lib/redis");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const wa_instancia_service_1 = require("./wa-instancia.service");
/**
 * Serviço para processamento de webhooks da Evolution API.
 */
const CACHE_PREFIX = 'wa:instance:';
const CACHE_TTL = 3600; // 1 hora
exports.waWebhookService = {
    /**
     * Ponto de entrada para todos os eventos da Evolution API.
     */
    async handle(instance, event, data) {
        logger_1.logger.debug({ instance, event }, 'Processando Webhook Evolution API');
        switch (event) {
            case 'qrcode.updated':
                await this.handleQrCodeUpdated(instance, data);
                break;
            case 'connection.update':
                await this.handleConnectionUpdate(instance, data);
                break;
            case 'messages.upsert': {
                // 1. Tentar obter instância (com cache Redis)
                const cacheKey = `${CACHE_PREFIX}${instance}`;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let instancia = null;
                try {
                    const cached = await redis_1.redis.get(cacheKey);
                    if (cached) {
                        instancia = JSON.parse(cached);
                    }
                }
                catch (err) {
                    logger_1.logger.error({ instance, err }, 'Erro ao ler cache do Redis');
                }
                if (!instancia) {
                    instancia = await prisma_1.prisma.waInstancia.findUnique({
                        where: { evolutionName: instance },
                    });
                    if (instancia) {
                        try {
                            await redis_1.redis.set(cacheKey, JSON.stringify(instancia), 'EX', CACHE_TTL);
                        }
                        catch (err) {
                            logger_1.logger.error({ instance, err }, 'Erro ao gravar no Redis');
                        }
                    }
                }
                if (instancia) {
                    await this.handleMessageUpsert(instancia, data);
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
    async handleQrCodeUpdated(evolutionName, data) {
        await wa_instancia_service_1.waInstanciaService.processarQrCode(evolutionName, data.qrcode.base64);
    },
    /**
     * Actualiza o estado da conexão da instância.
     */
    async handleConnectionUpdate(evolutionName, data) {
        const { state, number } = data;
        const numeroTelefone = number ? number.split(':')[0] : undefined;
        await wa_instancia_service_1.waInstanciaService.processarConexao(evolutionName, state, numeroTelefone);
    },
    /**
     * Processa mensagens de entrada e encaminha para a máquina de estados.
     */
    async handleMessageUpsert(instancia, data) {
        const { key, message } = data;
        // Ignorar se não for mensagem de chat ou for nossa
        const remoteJid = key?.remoteJid;
        if (!message || !remoteJid || remoteJid.includes('@g.us') || key.fromMe) {
            return;
        }
        const numeroWhatsapp = remoteJid.split('@')[0];
        const conteudo = message.conversation ||
            message.extendedTextMessage?.text ||
            '[Media/Outro]';
        // 1. Criar/Actualizar Conversa
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
            },
            update: {
                ultimaMensagemEm: new Date(),
            },
            include: { instancia: true },
        });
        // 2. Persistir Mensagem
        await prisma_1.prisma.waMensagem.create({
            data: {
                conversaId: conversa.id,
                conteudo,
                direcao: client_1.WaDirecao.ENTRADA,
                evolutionMsgId: key.id,
            },
        });
        // 3. Montar Schema Unificado (ClinicaMessage)
        const clinicaMessage = {
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
        const botAtivo = await prisma_1.prisma.botIntegracao.findFirst({
            where: { instanciaId: instancia.id, ativo: true }
        });
        if (botAtivo) {
            logger_1.logger.info({ conversaId: conversa.id }, 'Mensagem guardada; não enviada à Intel porque há um Bot Externo (Typebot/N8N) ativo nesta instância.');
            return;
        }
        // 5. Encaminhar para o FastAPI (Intent Router / Agente)
        const INTEL_URL = process.env.INTEL_SERVICE_URL || 'http://localhost:8001';
        try {
            await axios_1.default.post(`${INTEL_URL}/webhook/unified`, clinicaMessage);
            logger_1.logger.info({ clinicaMessage }, 'Mensagem Evolution reencaminhada para a ClinicaPlus Intelligence');
        }
        catch (apiErr) {
            logger_1.logger.error({ apiErr }, 'Erro ao encaminhar mensagem para ClinicaPlus Intelligence (FastAPI)');
        }
        logger_1.logger.info({ conversaId: conversa.id }, 'Mensagem recebida do Webhook Evolution normalizada');
    },
};
