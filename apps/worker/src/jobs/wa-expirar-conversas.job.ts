import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { subHours } from 'date-fns';

/**
 * Job para expirar conversas do WhatsApp que ficaram sem resposta há mais de 24h.
 */
export async function jobWaExpirarConversas() {
  const log = logger.child({ job: 'wa-expirar-conversas' });
  log.info('Iniciando job de expiração de conversas WA');

  try {
    const limite = subHours(new Date(), 24);

    const result = await prisma.waConversa.updateMany({
      where: {
        estado: { notIn: ['CONCLUIDA', 'EXPIRADA'] },
        ultimaMensagemEm: { lt: limite },
      },
      data: {
        estado: 'EXPIRADA',
      },
    });

    if (result.count > 0) {
      log.info({ count: result.count }, 'Conversas expiradas com sucesso');
    }
  } catch (err) {
    log.error({ err }, 'Erro ao expirar conversas');
    throw err;
  }
}
