import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { addDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import axios from 'axios';

/**
 * Job para enviar lembretes de cobrança de faturas
 */
export async function jobWaCobrancaLembrete() {
  const log = logger.child({ job: 'wa-cobranca-lembrete' });
  log.info('Iniciando ciclo de lembretes de cobrança');

  try {
    const agora = new Date();
    const amanha = addDays(agora, 1);
    
    // Busca faturas que vencem amanhã
    const faturasVencendo = await prisma.fatura.findMany({
      where: {
        dataVencimento: {
          gte: startOfDay(amanha),
          lte: endOfDay(amanha),
        },
        estado: 'EMITIDA',
        paciente: { telefone: { not: null } },
      },
      include: {
        paciente: true,
      },
    });

    log.info({ count: faturasVencendo.length }, 'Faturas vencendo amanhã encontradas');

    let enviados = 0;
    let falhas = 0;

    for (const fatura of faturasVencendo) {
      try {
        // Chama API interna para enviar lembrete
        await axios.post(`${process.env.API_URL || 'http://localhost:3000'}/api/whatsapp/cobranca-lembrete`, {
          faturaId: fatura.id,
        }, {
          headers: {
            'x-api-key': process.env.WORKER_API_KEY || 'worker-key',
          },
        });
        enviados++;
      } catch (error) {
        log.error({ faturaId: fatura.id, error }, 'Falha ao enviar lembrete de cobrança');
        falhas++;
      }
    }

    log.info({ enviados, falhas }, 'Ciclo de lembretes de cobrança concluído');
  } catch (err) {
    log.error({ err }, 'Falha fatal no job de lembretes de cobrança');
    throw err;
  }
}

/**
 * Job para enviar notificações de cobrança em atraso
 */
export async function jobWaCobrancaAtraso() {
  const log = logger.child({ job: 'wa-cobranca-atraso' });
  log.info('Iniciando ciclo de notificações de atraso');

  try {
    const agora = new Date();
    
    // Busca faturas em atraso (1, 7, 15 dias)
    const diasAtraso = [1, 7, 15];
    const faturasAtrasadas = await prisma.fatura.findMany({
      where: {
        estado: 'EMITIDA',
        dataVencimento: {
          lt: agora,
        },
        paciente: { telefone: { not: null } },
      },
      include: {
        paciente: true,
      },
    });

    log.info({ count: faturasAtrasadas.length }, 'Faturas em atraso encontradas');

    let enviados = 0;
    let falhas = 0;

    for (const fatura of faturasAtrasadas) {
      const diasAtrasoCalculado = differenceInDays(agora, fatura.dataVencimento!);
      
      // Só envia se estiver nos dias de notificação configurados
      if (!diasAtraso.includes(diasAtrasoCalculado)) continue;

      try {
        // Chama API interna para enviar notificação de atraso
        await axios.post(`${process.env.API_URL || 'http://localhost:3000'}/api/whatsapp/cobranca-lembrete`, {
          faturaId: fatura.id,
        }, {
          headers: {
            'x-api-key': process.env.WORKER_API_KEY || 'worker-key',
          },
        });
        enviados++;
      } catch (error) {
        log.error({ faturaId: fatura.id, error }, 'Falha ao enviar notificação de atraso');
        falhas++;
      }
    }

    log.info({ enviados, falhas }, 'Ciclo de notificações de atraso concluído');
  } catch (err) {
    log.error({ err }, 'Falha fatal no job de notificações de atraso');
    throw err;
  }
}

/**
 * Job para enviar confirmação de pagamento (quando pagamento é registrado)
 */
export async function jobWaCobrancaConfirmacao(pagamentoId: string) {
  const log = logger.child({ job: 'wa-cobranca-confirmacao' });
  log.info({ pagamentoId }, 'Enviando confirmação de pagamento');

  try {
    const pagamento = await prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: {
        fatura: {
          include: {
            paciente: true,
          },
        },
      },
    });

    if (!pagamento || !pagamento.fatura.paciente.telefone) {
      log.warn('Pagamento não encontrado ou paciente sem telefone');
      return;
    }

    // TODO: Implementar envio via API ou serviço compartilhado
    log.info({ pagamentoId }, 'Confirmação de pagamento seria enviada aqui');
  } catch (err) {
    log.error({ err, pagamentoId }, 'Falha ao enviar confirmação de pagamento');
    throw err;
  }
}
