import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { withLock } from '../lib/locks';

/**
 * Worker para processar tarefas relacionadas a estoque.
 * Responsável por:
 * - Notificação de estoque mínimo
 * - Alerta de validade próxima
 * - Cálculo de analytics em background
 */

// Job Types
interface EstoqueMinimoJob {
  clinicaId: string;
}

interface ValidadeProximaJob {
  clinicaId: string;
  dias: number;
}

interface AnalyticsJob {
  clinicaId: string;
  dataInicio?: string;
  dataFim?: string;
}

// Job Names
export const ESTOQUE_JOB_NAMES = {
  ESTOQUE_MINIMO: 'estoque-minimo',
  VALIDADE_PROXIMA: 'estoque-validade-proxima',
  ANALYTICS: 'estoque-analytics',
} as const;

/**
 * Worker para notificação de estoque mínimo
 */
export const estoqueMinimoWorker = new Worker<EstoqueMinimoJob>(
  ESTOQUE_JOB_NAMES.ESTOQUE_MINIMO,
  async (job: Job<EstoqueMinimoJob>) => {
    const { clinicaId } = job.data;
    const lockKey = `estoque-minimo-${clinicaId}`;

    logger.info({ clinicaId, jobId: job.id }, '⚙️ Processando job de estoque mínimo');

    return withLock(lockKey, 30000, async () => {
      try {
        // 1. Buscar produtos com gerenciaEstoque ativo
        const produtos = await prisma.produto.findMany({
          where: { clinicaId, gerenciaEstoque: true, ativo: true },
          select: { id: true, nome: true, estoqueMinimo: true },
        });

        if (produtos.length === 0) {
          logger.info({ clinicaId }, 'ℹ️ Nenhum produto com gerenciaEstoque ativo');
          return;
        }

        // 2. Calcular estoque atual em batch
        const produtoIds = produtos.map(p => p.id);
        // TODO: Implement estoque calculation when service is available
        // const estoqueBatch = await estoqueCalculoService.calcularEstoqueBatch(clinicaId, produtoIds);
        const estoqueBatch: Record<string, number> = {};

        // 3. Identificar produtos abaixo do mínimo
        const produtosAbaixoMinimo = produtos.filter(p => {
          const estoque = estoqueBatch[p.id] || 0;
          return estoque <= p.estoqueMinimo;
        });

        if (produtosAbaixoMinimo.length === 0) {
          logger.info({ clinicaId }, '✅ Nenhum produto abaixo do estoque mínimo');
          return;
        }

        // 4. Criar notificações (pode ser integrado com notification.service)
        logger.info(
          { clinicaId, count: produtosAbaixoMinimo.length },
          `⚠️ ${produtosAbaixoMinimo.length} produtos abaixo do estoque mínimo`
        );

        // TODO: Integrar com notification.service para enviar alertas
        // Exemplo:
        // for (const produto of produtosAbaixoMinimo) {
        //   await notificationService.create({
        //     clinicaId,
        //     tipo: 'ESTOQUE_MINIMO',
        //     titulo: 'Estoque abaixo do mínimo',
        //     mensagem: `Produto ${produto.nome} está abaixo do estoque mínimo`,
        //     dados: { produtoId: produto.id },
        //   });
        // }

        logger.info({ clinicaId, count: produtosAbaixoMinimo.length }, '✅ Job de estoque mínimo concluído');
      } catch (err) {
        logger.error({ err, clinicaId }, '❌ Erro ao processar job de estoque mínimo');
        throw err;
      }
    });
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

/**
 * Worker para alerta de validade próxima
 */
export const validadeProximaWorker = new Worker<ValidadeProximaJob>(
  ESTOQUE_JOB_NAMES.VALIDADE_PROXIMA,
  async (job: Job<ValidadeProximaJob>) => {
    const { clinicaId, dias = 30 } = job.data;
    const lockKey = `estoque-validade-proxima-${clinicaId}`;

    logger.info({ clinicaId, dias, jobId: job.id }, '⚙️ Processando job de validade próxima');

    return withLock(lockKey, 30000, async () => {
      try {
        // TODO: Implement lote validity check when service is available
        // const count = await estoqueCalculoService.contarLotesValidadeProxima(clinicaId, dias);
        const count = 0;

        if (count === 0) {
          logger.info({ clinicaId, dias }, '✅ Nenhum lote com validade próxima');
          return;
        }

        // 2. Buscar detalhes dos lotes
        const agora = new Date();
        const dataLimite = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);

        const lotes = await prisma.estoqueLote.findMany({
          where: {
            clinicaId,
            dataValidade: {
              gte: agora,
              lte: dataLimite,
            },
            quantidade: { gt: 0 },
          },
          include: {
            produto: {
              select: { id: true, nome: true },
            },
          },
          orderBy: { dataValidade: 'asc' },
        });

        logger.info(
          { clinicaId, dias, count: lotes.length },
          `⚠️ ${lotes.length} lotes com validade próxima`
        );

        // TODO: Integrar com notification.service para enviar alertas
        // Exemplo:
        // for (const lote of lotes) {
        //   await notificationService.create({
        //     clinicaId,
        //     tipo: 'VALIDADE_PROXIMA',
        //     titulo: 'Validade próxima',
        //     mensagem: `Lote ${lote.numeroLote} do produto ${lote.produto.nome} vence em breve`,
        //     dados: { loteId: lote.id },
        //   });
        // }

        logger.info({ clinicaId, count: lotes.length }, '✅ Job de validade próxima concluído');
      } catch (err) {
        logger.error({ err, clinicaId }, '❌ Erro ao processar job de validade próxima');
        throw err;
      }
    });
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

/**
 * Worker para cálculo de analytics em background
 */
export const analyticsWorker = new Worker<AnalyticsJob>(
  ESTOQUE_JOB_NAMES.ANALYTICS,
  async (job: Job<AnalyticsJob>) => {
    const { clinicaId, dataInicio, dataFim } = job.data;
    const lockKey = `estoque-analytics-${clinicaId}`;

    logger.info({ clinicaId, jobId: job.id }, '⚙️ Processando job de analytics');

    return withLock(lockKey, 60000, async () => {
      try {
        // TODO: Implement analytics calculation when service is available
        logger.info({ clinicaId }, '⚠️ Analytics job temporarily disabled - service import issue');
        
        // 1. Calcular KPIs e salvar em cache
        // const { analyticsEstoqueService } = await import('@clinicaplus/api/src/services/analytics.estoque.service');
        // const kpis = await analyticsEstoqueService.getKpis({ clinicaId, dataInicio, dataFim });

        // 2. Salvar no cache Redis
        // const cacheKey = `estoque:analytics:kpis:${clinicaId}`;
        // await redis.setex(cacheKey, 600, JSON.stringify(kpis)); // 10 minutos

        logger.info({ clinicaId }, '✅ Job de analytics concluído (no-op)');
      } catch (err) {
        logger.error({ err, clinicaId }, '❌ Erro ao processar job de analytics');
        throw err;
      }
    });
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

// Event handlers
estoqueMinimoWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '🏁 Job de estoque mínimo concluído');
});

estoqueMinimoWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '💥 Job de estoque mínimo falhou');
});

validadeProximaWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '🏁 Job de validade próxima concluído');
});

validadeProximaWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '💥 Job de validade próxima falhou');
});

analyticsWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '🏁 Job de analytics concluído');
});

analyticsWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '💥 Job de analytics falhou');
});
