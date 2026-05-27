"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const axios_1 = __importDefault(require("axios"));
const prisma_mock_1 = require("../test/mocks/prisma.mock");
const evolutionApi_mock_1 = require("../test/mocks/evolutionApi.mock");
const client_1 = require("@prisma/client");
// Mock dependências
vitest_1.vi.mock('axios', () => ({ default: { post: vitest_1.vi.fn().mockResolvedValue({ data: {} }) } }));
vitest_1.vi.mock('../lib/evolutionApi', () => ({ evolutionApi: evolutionApi_mock_1.mockEvolutionApi }));
vitest_1.vi.mock('../lib/prisma', () => ({ prisma: prisma_mock_1.mockPrisma }));
vitest_1.vi.mock('../lib/redis', () => ({ redis: { get: vitest_1.vi.fn().mockResolvedValue(null), set: vitest_1.vi.fn().mockResolvedValue('OK'), del: vitest_1.vi.fn().mockResolvedValue(1) } }));
vitest_1.vi.mock('./wa-instancia.service', () => ({
    waInstanciaService: {
        processarQrCode: vitest_1.vi.fn(),
        processarConexao: vitest_1.vi.fn(),
        getInstanciaOrThrow: vitest_1.vi.fn()
    }
}));
const wa_webhook_service_1 = require("./wa-webhook.service");
const wa_instancia_service_1 = require("./wa-instancia.service");
(0, vitest_1.describe)('waWebhookService', () => {
    const instanceName = 'cp-test-prod';
    const instanceId = 'ins-123';
    const clinicaId = 'clinica-1';
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue({
            id: instanceId,
            clinicaId,
            evolutionName: instanceName,
            evolutionToken: 'token-123',
            estado: client_1.WaEstadoInstancia.DESCONECTADO,
            numeroTelefone: null,
            qrCodeBase64: null,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
            qrExpiresAt: null,
        });
        prisma_mock_1.mockPrisma.waAutomacao.findMany.mockResolvedValue([]);
    });
    (0, vitest_1.describe)('QRCODE_UPDATED', () => {
        (0, vitest_1.it)('deve delegar atualização de QR Code ao waInstanciaService', async () => {
            const payload = {
                event: 'qrcode.updated',
                instance: instanceName,
                data: { qrcode: { base64: 'base64-string' } }
            };
            await wa_webhook_service_1.waWebhookService.handle(payload.instance, payload.event, payload.data);
            (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.processarQrCode).toHaveBeenCalledWith(instanceName, 'base64-string');
        });
    });
    (0, vitest_1.describe)('CONNECTION_UPDATE', () => {
        (0, vitest_1.it)('deve delegar atualização de conexão ao waInstanciaService', async () => {
            const payload = {
                event: 'connection.update',
                instance: instanceName,
                data: { state: 'open', number: '244900000000:1@s.whatsapp.net' }
            };
            await wa_webhook_service_1.waWebhookService.handle(payload.instance, payload.event, payload.data);
            (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.processarConexao).toHaveBeenCalledWith(instanceName, 'open', '244900000000');
        });
    });
    (0, vitest_1.describe)('MESSAGES_UPSERT', () => {
        const remoteJid = '244900000000@s.whatsapp.net';
        const cleanNumber = '244900000000';
        (0, vitest_1.it)('deve ignorar mensagens enviadas por nós mesmos', async () => {
            const payload = {
                event: 'messages.upsert',
                instance: instanceName,
                data: {
                    key: { fromMe: true, remoteJid, id: 'self-msg' },
                    message: { conversation: 'teste' }
                }
            };
            await wa_webhook_service_1.waWebhookService.handle(payload.instance, payload.event, payload.data);
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.upsert).not.toHaveBeenCalled();
            (0, vitest_1.expect)(axios_1.default.post).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('deve ignorar mensagens de grupos (@g.us)', async () => {
            const payload = {
                event: 'messages.upsert',
                instance: instanceName,
                data: {
                    key: { fromMe: false, remoteJid: '123456@g.us', id: 'group-msg' },
                    message: { conversation: 'mensagem do grupo' }
                }
            };
            await wa_webhook_service_1.waWebhookService.handle(payload.instance, payload.event, payload.data);
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waConversa.upsert).not.toHaveBeenCalled();
            (0, vitest_1.expect)(axios_1.default.post).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('deve criar/atualizar conversa e chamar o serviço de conversa para mensagens de entrada', async () => {
            const conversationId = 'conv-123';
            const mockConversa = {
                id: conversationId,
                instanciaId: instanceId,
                clinicaId,
                numeroWhatsapp: cleanNumber,
                estado: client_1.WaEstadoConversa.AGUARDA_INPUT,
                etapaFluxo: null,
                contexto: null,
                ultimaMensagemEm: new Date(),
                criadoEm: new Date(),
                pacienteId: null,
                instancia: {
                    id: instanceId,
                    clinicaId,
                    evolutionName: instanceName,
                    evolutionToken: 'token-123',
                    estado: client_1.WaEstadoInstancia.CONECTADO,
                    numeroTelefone: cleanNumber,
                    qrCodeBase64: null,
                    criadoEm: new Date(),
                    atualizadoEm: new Date(),
                    qrExpiresAt: null
                }
            };
            prisma_mock_1.mockPrisma.waConversa.upsert.mockResolvedValue(mockConversa);
            prisma_mock_1.mockPrisma.botIntegracao.findFirst.mockResolvedValue(null);
            const payload = {
                event: 'messages.upsert',
                instance: instanceName,
                data: {
                    id: 'msg-abc',
                    key: { fromMe: false, remoteJid, id: 'msg-abc' },
                    message: { conversation: 'Marcar consulta' },
                    pushName: 'João Silva'
                }
            };
            await wa_webhook_service_1.waWebhookService.handle(payload.instance, payload.event, payload.data);
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waMensagem.create).toHaveBeenCalledWith({
                data: {
                    conversaId: conversationId,
                    direcao: client_1.WaDirecao.ENTRADA,
                    conteudo: 'Marcar consulta',
                    evolutionMsgId: 'msg-abc'
                }
            });
            (0, vitest_1.expect)(axios_1.default.post).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/webhook/unified'), vitest_1.expect.objectContaining({
                clinicaId,
                instanciaId: instanceId,
                channel: 'BAILEYS',
                telefone: cleanNumber,
                value: 'Marcar consulta',
                messageId: 'msg-abc'
            }));
        });
        (0, vitest_1.it)('não deve encaminhar para a Intel se houver bot externo activo', async () => {
            const conversationId = 'conv-456';
            prisma_mock_1.mockPrisma.waConversa.upsert.mockResolvedValue({
                id: conversationId,
                instanciaId: instanceId,
                clinicaId,
                numeroWhatsapp: cleanNumber,
                estado: client_1.WaEstadoConversa.AGUARDA_INPUT,
            });
            prisma_mock_1.mockPrisma.botIntegracao.findFirst.mockResolvedValue({ id: 'bot-1', ativo: true });
            const payload = {
                event: 'messages.upsert',
                instance: instanceName,
                data: {
                    key: { fromMe: false, remoteJid, id: 'msg-bot' },
                    message: { conversation: 'teste bot externo' }
                }
            };
            await wa_webhook_service_1.waWebhookService.handle(payload.instance, payload.event, payload.data);
            (0, vitest_1.expect)(axios_1.default.post).not.toHaveBeenCalled();
        });
    });
});
