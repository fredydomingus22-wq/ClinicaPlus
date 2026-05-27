"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionApi = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const AppError_1 = require("./AppError");
const evo = axios_1.default.create({
    baseURL: config_1.config.EVOLUTION_API_URL,
    headers: { apikey: config_1.config.EVOLUTION_API_KEY },
    timeout: 15000,
});
// Interceptor: converter erros da Evolution API em AppError
evo.interceptors.response.use(res => res, (err) => {
    const msg = err.response?.data?.message ?? err.message;
    throw new AppError_1.AppError(`Evolution API: ${msg}`, 502, 'EVOLUTION_API_ERROR');
});
/**
 * Cliente para interagir com a Evolution API.
 */
exports.evolutionApi = {
    /**
     * Cria uma nova instância na Evolution API.
     */
    async criarInstancia(instanceName, webhookUrl) {
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
        return data;
    },
    /**
     * Obtém o QR Code em base64 para conexão.
     */
    async obterQrCode(instanceName) {
        const { data } = await evo.get(`/instance/connect/${instanceName}`);
        return data;
    },
    /**
     * Verifica o estado da conexão da instância.
     */
    async estadoConexao(instanceName) {
        const { data } = await evo.get(`/instance/connectionState/${instanceName}`);
        return data;
    },
    /**
     * Envia uma mensagem de texto simples.
     */
    async enviarTexto(instanceName, numero, texto) {
        const { data } = await evo.post(`/message/sendText/${instanceName}`, {
            number: numero,
            text: texto,
            delay: 1200, // simula digitação (ms)
        });
        return data;
    },
    /**
     * Obtém detalhes da instância (incluindo número conectado).
     */
    async obterDetalhes(instanceName) {
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
    async desligar(instanceName) {
        await evo.delete(`/instance/logout/${instanceName}`);
    },
    /**
     * Elimina a instância.
     */
    async eliminar(instanceName) {
        await evo.delete(`/instance/delete/${instanceName}`);
    },
    /**
     * Actualizar webhook.
     */
    async actualizarWebhook(instanceName, webhookUrl) {
        await evo.post(`/webhook/set/${instanceName}`, {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
        });
    },
    /**
     * Configura o Typebot na instância da Evolution API (Injeção nativa)
     */
    async configurarTypebot(instanceName, setup) {
        await evo.post(`/typebot/set/${instanceName}`, {
            enabled: setup.enabled,
            url: setup.url,
            typebot: setup.typebot,
            expire: setup.expire || 20,
            keywordFinish: setup.keywordFinish || '#sair',
            delayMessage: 1000,
            unknownMessage: setup.unknownMessage || 'Desculpe, não entendi. Mande #sair para voltar ao menu principal.',
            listeningFromMe: false,
            stopBotFromMe: true,
            keepOpen: false,
            debounceTime: 10,
            ignoreJids: [],
            variables: setup.variables || [],
        });
    },
};
