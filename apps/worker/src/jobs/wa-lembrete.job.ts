import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { whatsappQueue } from '../lib/queues';
import { addHours, addDays, startOfDay, endOfDay, format } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Templates de mensagens para lembretes
 */
const TEMPLATES = {
  '24h': (nome: string, hora: string) => 
    `Olá ${nome}, lembramos o seu agendamento para amanhã às ${hora}.`,
  '2h': (nome: string, hora: string) => 
    `Olá ${nome}, o seu agendamento é daqui a pouco, às ${hora}.`
};

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

    let enfileirados = 0;
    for (const ag of agendamentos) {
      const instancia = ag.clinica.waInstancias[0];
      if (!instancia || instancia.automacoes.length === 0) continue;

      const horaFormatada = format(ag.dataHora, 'HH:mm', { locale: pt });
      const texto = TEMPLATES[tipo](ag.paciente.nome, horaFormatada);

      await whatsappQueue.add('lembrete', {
        numero: ag.paciente.telefone!,
        clinicaId: ag.clinicaId,
        texto,
        agendamentoId: ag.id
      }, {
        jobId: `wa-rem-${tipo}-${ag.id}`
      });
      enfileirados++;
    }

    log.info({ enfileirados }, 'Ciclo de lembretes concluído');
  } catch (err) {
    log.error({ err }, 'Falha fatal no job de lembretes');
    throw err;
  }
}
