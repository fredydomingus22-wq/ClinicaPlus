"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waMensagemService = void 0;
const prisma_1 = require("../lib/prisma");
const evolutionApi_1 = require("../lib/evolutionApi");
const AppError_1 = require("../lib/AppError");
/**
 * Serviço para envio centralizado de mensagens WhatsApp e registo histórico.
 */
exports.waMensagemService = {
    /**
     * Envia uma mensagem de texto para uma conversa e persiste no DB.
     */
    async enviarMensagem(conversaId, texto) {
        // 1. Obter detalhes da conversa
        const conversa = await prisma_1.prisma.waConversa.findUnique({
            where: { id: conversaId },
            include: { instancia: true },
        });
        if (!conversa || !conversa.instancia) {
            throw new AppError_1.AppError('Conversa ou instância não encontrada', 404, 'NOT_FOUND');
        }
        // 2. Enviar via Evolution API
        const response = await evolutionApi_1.evolutionApi.enviarTexto(conversa.instancia.evolutionName, conversa.numeroWhatsapp, texto);
        // 3. Registar no histórico
        const mensagem = await prisma_1.prisma.waMensagem.create({
            data: {
                conversaId,
                conteudo: texto,
                direcao: 'SAIDA',
                evolutionMsgId: response?.key?.id,
            },
        });
        return mensagem;
    },
};
