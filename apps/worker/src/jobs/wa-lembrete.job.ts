import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { whatsappQueue } from '../lib/queues';
import { addHours, addDays, startOfDay, endOfDay } from 'date-fns';
import axios from 'axios';

/**
 * Job para enviar lembretes de agendamento via WhatsApp.
 * @param tipo '24h' ou '2h'
 */
export async function jobWaLembretes(tipo: '24h' | '2h') {
  const log = logger.child({ job: `wa-lembrete-${tipo}` });
  log.info('Iniciando ciclo de lembretes');

  try {
    const agora = new Date();
    let inicio: Date;
    let fim: Date;

    if (tipo === '24h') {
      const amanha = addDays(agora, 1);
      inicio = startOfDay(amanha);
      fim = endOfDay(amanha);
    } else {
      const daquiA2h = addHours(agora, 2);
      // Janela de 30min em volta das 2h
      inicio = new Date(daquiA2h.getTime() - 15 * 60000);
      fim = new Date(daquiA2h.getTime() + 15 * 60000);
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        dataHora: { gte: inicio, lte: fim },
        estado: 'CONFIRMADO',
        paciente: { telefone: { not: null } },
      },
      include: {
        paciente: true,
        medico: true,
        clinica: {
          include: { 
            waInstancias: { 
              include: { 
                automacoes: { 
                  where: { 
                    tipo: tipo === '24h' ? 'LEMBRETE_24H' : 'LEMBRETE_2H', 
                    ativo: true 
                  } 
                } 
              } 
            } 
          }
        }
      }
    });

    log.info({ count: agendamentos.length }, 'Candidatos a lembrete encontrados');

    let enviados = 0;
    let falhas = 0;

    for (const ag of agendamentos) {
      const instancia = ag.clinica.waInstancias[0];
      if (!instancia || instancia.automacoes.length === 0) continue;

      try {
        // Chama API interna para enviar lembrete
        await axios.post(`${process.env.API_URL || 'http://localhost:3000'}/api/whatsapp/lembrete`, {
          agendamentoId: ag.id,
          tipo,
        }, {
          headers: {
            'x-api-key': process.env.WORKER_API_KEY || 'worker-key',
          },
        });
        enviados++;
      } catch (error) {
        log.error({ agendamentoId: ag.id, error }, 'Falha ao enviar lembrete');
        falhas++;
      }
    }

    log.info({ enviados, falhas }, 'Ciclo de lembretes concluído');
  } catch (err) {
    log.error({ err }, 'Falha fatal no job de lembretes');
    throw err;
  }
}
