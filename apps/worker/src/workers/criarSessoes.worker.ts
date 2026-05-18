import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { JobNames, type TratamentoGerarSessoesJob } from '@clinicaplus/events';

/**
 * Worker para geração automática de sessões de tratamento.
 * Consumido quando um PlanoTratamento é criado com status ACTIVO.
 */
export const criarSessoesWorker = new Worker<TratamentoGerarSessoesJob>(
  JobNames.TRATAMENTO_GERAR_SESSOES,
  async (job: Job<TratamentoGerarSessoesJob>) => {
    const log = logger.child({ jobId: job.id, planoId: job.data.planoId });
    log.info('Processing criar-sessoes job');

    const plano = await prisma.planoTratamento.findFirst({
      where: { id: job.data.planoId, clinicaId: job.data.clinicaId },
      include: { tipoTratamento: true },
    });

    if (!plano) {
      log.warn('Plano de tratamento não encontrado — abortando');
      return;
    }

    if (plano.estado !== 'ACTIVO') {
      log.info({ estado: plano.estado }, 'Plano não está ACTIVO — ignorando');
      return;
    }

    const totalSessoes = plano.totalSessoes;
    const duracaoMin = plano.tipoTratamento?.duracaoMin ?? 30;

    if (!totalSessoes || totalSessoes <= 0) {
      log.warn('Total de sessões inválido — abortando');
      return;
    }

    // Verificar sessões já existentes para evitar duplicação
    const sessoesExistentes = await prisma.sessaoTratamento.count({
      where: { planoId: plano.id },
    });

    if (sessoesExistentes >= totalSessoes) {
      log.info({ sessoesExistentes, totalSessoes }, 'Sessões já criadas — ignorando');
      return;
    }

    // Criar sessões restantes
    const sessoesACriar = totalSessoes - sessoesExistentes;
    
    // Gerar a partir da data de Início com a frequência estabelecida
    // Nota: Lógica simples adicionando dias conforme a frequência, para preenchimento provisório
    const sessoes = Array.from({ length: sessoesACriar }, (_, i) => {
      // Cria uma dataHora placeholder (a preencher depois pelas recepcionistas ou médicos)
      const dataSessao = new Date(plano.dataInicio);
      dataSessao.setDate(dataSessao.getDate() + (sessoesExistentes + i) * Math.max(1, Math.floor(7 / plano.frequenciaSemana)));

      return {
        planoId: plano.id,
        clinicaId: job.data.clinicaId,
        numeroSessao: sessoesExistentes + i + 1,
        duracao: duracaoMin,
        estado: 'AGENDADO' as const,
        dataHora: dataSessao
      };
    });

    await prisma.sessaoTratamento.createMany({ data: sessoes });

    log.info({ criadas: sessoesACriar, total: totalSessoes }, '✅ Sessões de tratamento criadas');
  },
  {
    connection: redis as any,
    concurrency: 5,
  }
);

criarSessoesWorker.on('failed', (job: Job<TratamentoGerarSessoesJob> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, planoId: job?.data?.planoId, err: err.message }, 'criar-sessoes job failed');
});

criarSessoesWorker.on('completed', (job: Job<TratamentoGerarSessoesJob>) => {
  logger.info({ jobId: job.id, planoId: job.data.planoId }, 'criar-sessoes job completed');
});
