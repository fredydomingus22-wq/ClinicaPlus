import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { JobNames, TratamentoGerarSessoesJob } from '@clinicaplus/events';
import { redis } from '../lib/redis';
import { withLock } from '../lib/locks';
import { addDays } from 'date-fns';

/**
 * Worker para processar tarefas relacionadas a tratamentos.
 * Atualmente responsável por gerar sessões automáticas a partir de um plano.
 * Migrado do API para apps/worker para isolar carga assíncrona.
 */
export const tratamentoWorker = new Worker<TratamentoGerarSessoesJob>(
  JobNames.TRATAMENTO_GERAR_SESSOES,
  async (job: Job<TratamentoGerarSessoesJob>) => {
    const { planoId, clinicaId } = job.data;
    const lockKey = `tratamento:gerar-sessoes:${planoId}`;

    logger.info({ planoId, clinicaId, jobId: job.id }, '⚙️ Processando job de geração de sessões');

    // Use distributed lock to prevent race conditions
    return withLock(lockKey, 30000, async () => {
      try {
        // 1. Buscar o plano com detalhes
        const plano = await prisma.planoTratamento.findUnique({
          where: { id: planoId, clinicaId },
          include: { tipoTratamento: true }
        });

        if (!plano) {
          logger.error({ planoId, clinicaId }, '❌ Plano não encontrado para o worker');
          return;
        }

        // 2. Idempotência: Verificar se já existem sessões
        const sessoesExistentes = await prisma.sessaoTratamento.count({
          where: { planoId, clinicaId }
        });

        if (sessoesExistentes > 0) {
          logger.warn({ planoId, clinicaId }, '⚠️ Sessões já existem para este plano. Ignorando.');
          return;
        }

        // 3. Lógica de Geração de Sessões
        // Ex: 10 sessões, 2x por semana (ex: Segunda e Quinta) -> Calculado simplificado para Sprint II
        // Para a Sprint II, faremos uma distribuição linear simples (ex: a cada X dias)
        const sessoes = [];
        const { totalSessoes, frequenciaSemana, dataInicio } = plano;
        
        // Dias entre sessões (aproximado)
        const diasIntervalo = Math.floor(7 / frequenciaSemana);

        for (let i = 1; i <= totalSessoes; i++) {
          const dataSessao = addDays(new Date(dataInicio), (i - 1) * diasIntervalo);
          
          sessoes.push({
            clinicaId,
            planoId,
            numeroSessao: i,
            estado: 'AGENDADO',
            dataHora: dataSessao,
            duracao: plano.tipoTratamento?.duracaoMin || 45,
            notas: `Sessão ${i} gerada automaticamente.`
          });
        }

        // 4. Gravar no banco via transação (batch create)
        await prisma.sessaoTratamento.createMany({
          // @ts-expect-error - Prisma createMany data type is sometimes finicky in monorepos
          data: sessoes
        });

        logger.info({ planoId, count: sessoes.length }, '✅ Sessões geradas com sucesso');
      } catch (err) {
        logger.error({ err, planoId }, '❌ Erro ao gerar sessões no worker');
        throw err; // Re-throw para o BullMQ tentar novamente se configurado
      }
    });
  },
  { 
    connection: redis,
    concurrency: 5
  }
);

tratamentoWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '🏁 Job de tratamento concluído');
});

tratamentoWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '💥 Job de tratamento falhou');
});
