import { WaMensagem } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { evolutionApi, EvolutionMessageResponse } from '../lib/evolutionApi';
import { AppError } from '../lib/AppError';

/**
 * Serviço para envio centralizado de mensagens WhatsApp e registo histórico.
 */
export const waMensagemService = {
  /**
   * Envia uma mensagem de texto para uma conversa e persiste no DB.
   */
  async enviarMensagem(conversaId: string, texto: string): Promise<WaMensagem> {
    // 1. Obter detalhes da conversa
    const conversa = await prisma.waConversa.findUnique({
      where: { id: conversaId },
      include: { instancia: true },
    });

    if (!conversa || !conversa.instancia) {
      throw new AppError('Conversa ou instância não encontrada', 404, 'NOT_FOUND');
    }

    // 2. Enviar via Evolution API
    const response: EvolutionMessageResponse = await evolutionApi.enviarTexto(
      conversa.instancia.evolutionName,
      conversa.numeroWhatsapp,
      texto
    );

    // 3. Registar no histórico
    const mensagem = await prisma.waMensagem.create({
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
