import { Worker, Job } from 'bullmq';
import { JobNames, TratamentoGerarSessoesJob } from '@clinicaplus/events';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { addDays, startOfDay } from 'date-fns';

/**
 * Worker para gerar sessões de tratamento de forma assíncrona.
 */
export const criarSessoesWorker = new Worker<TratamentoGerarSessoesJob>(
  JobNames.TRATAMENTO_GERAR_SESSOES,
  async (job: Job<TratamentoGerarSessoesJob>) => {
    const { planoId, clinicaId } = job.data;

    const plano = await prisma.planoTratamento.findUnique({
      where: { id: planoId, clinicaId },
      include: { tipoTratamento: true }
    });

    if (!plano) {
      logger.error({ planoId }, 'Plano não encontrado para geração de sessões');
      return;
    }

    const { totalSessoes, frequenciaSemana, dataInicio } = plano;
    
    // Lógica de agendamento baseada na frequência
    // Ex: Se f=2, agendamos a cada 3.5 dias (simplificado para Sprint II)
    const intervaloDias = Math.floor(7 / frequenciaSemana);
    
    const sessoesData = [];
    let dataAtual = startOfDay(new Date(dataInicio));

    for (let i = 1; i <= totalSessoes; i++) {
      sessoesData.push({
        clinicaId,
        planoId,
        numeroSessao: i,
        estado: 'AGENDADO' as const,
        dataHora: dataAtual,
        duracao: plano.tipoTratamento.duracaoMin ?? 30,
      });
      
      dataAtual = addDays(dataAtual, intervaloDias);
    }

    await prisma.$transaction([
      // Limpar sessoes existentes se for um re-run (idempotência manual além do BullMQ)
      prisma.sessaoTratamento.deleteMany({ where: { planoId } }),
      prisma.sessaoTratamento.createMany({ data: sessoesData })
    ]);

    logger.info({ planoId, sessoesCriadas: sessoesData.length }, 'Sessões de tratamento geradas com sucesso');
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

criarSessoesWorker.on('failed', (job, err) => {
  logger.error({ job: job?.id, err }, 'Job de geração de sessões falhou');
});
