"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsWorker = exports.validadeProximaWorker = exports.estoqueMinimoWorker = exports.ESTOQUE_JOB_NAMES = void 0;
const bullmq_1 = require("bullmq");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const redis_1 = require("../lib/redis");
const locks_1 = require("../lib/locks");
const estoque_calculo_service_1 = require("@clinicaplus/api/src/services/estoque.calculo.service");
// Job Names
exports.ESTOQUE_JOB_NAMES = {
    ESTOQUE_MINIMO: 'estoque:minimo',
    VALIDADE_PROXIMA: 'estoque:validade-proxima',
    ANALYTICS: 'estoque:analytics',
};
/**
 * Worker para notificação de estoque mínimo
 */
exports.estoqueMinimoWorker = new bullmq_1.Worker(exports.ESTOQUE_JOB_NAMES.ESTOQUE_MINIMO, async (job) => {
    const { clinicaId } = job.data;
    const lockKey = `estoque:minimo:${clinicaId}`;
    logger_1.logger.info({ clinicaId, jobId: job.id }, '⚙️ Processando job de estoque mínimo');
    return (0, locks_1.withLock)(lockKey, 30000, async () => {
        try {
            // 1. Buscar produtos com gerenciaEstoque ativo
            const produtos = await prisma_1.prisma.produto.findMany({
                where: { clinicaId, gerenciaEstoque: true, ativo: true },
                select: { id: true, nome: true, estoqueMinimo: true },
            });
            if (produtos.length === 0) {
                logger_1.logger.info({ clinicaId }, 'ℹ️ Nenhum produto com gerenciaEstoque ativo');
                return;
            }
            // 2. Calcular estoque atual em batch
            const produtoIds = produtos.map(p => p.id);
            const estoqueBatch = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueBatch(clinicaId, produtoIds);
            // 3. Identificar produtos abaixo do mínimo
            const produtosAbaixoMinimo = produtos.filter(p => {
                const estoque = estoqueBatch[p.id] || 0;
                return estoque <= p.estoqueMinimo;
            });
            if (produtosAbaixoMinimo.length === 0) {
                logger_1.logger.info({ clinicaId }, '✅ Nenhum produto abaixo do estoque mínimo');
                return;
            }
            // 4. Criar notificações (pode ser integrado com notification.service)
            logger_1.logger.info({ clinicaId, count: produtosAbaixoMinimo.length }, `⚠️ ${produtosAbaixoMinimo.length} produtos abaixo do estoque mínimo`);
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
            logger_1.logger.info({ clinicaId, count: produtosAbaixoMinimo.length }, '✅ Job de estoque mínimo concluído');
        }
        catch (err) {
            logger_1.logger.error({ err, clinicaId }, '❌ Erro ao processar job de estoque mínimo');
            throw err;
        }
    });
}, {
    connection: redis_1.redis,
    concurrency: 3,
});
/**
 * Worker para alerta de validade próxima
 */
exports.validadeProximaWorker = new bullmq_1.Worker(exports.ESTOQUE_JOB_NAMES.VALIDADE_PROXIMA, async (job) => {
    const { clinicaId, dias = 30 } = job.data;
    const lockKey = `estoque:validade-proxima:${clinicaId}`;
    logger_1.logger.info({ clinicaId, dias, jobId: job.id }, '⚙️ Processando job de validade próxima');
    return (0, locks_1.withLock)(lockKey, 30000, async () => {
        try {
            // 1. Contar lotes com validade próxima
            const count = await estoque_calculo_service_1.estoqueCalculoService.contarLotesValidadeProxima(clinicaId, dias);
            if (count === 0) {
                logger_1.logger.info({ clinicaId, dias }, '✅ Nenhum lote com validade próxima');
                return;
            }
            // 2. Buscar detalhes dos lotes
            const agora = new Date();
            const dataLimite = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
            const lotes = await prisma_1.prisma.estoqueLote.findMany({
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
            logger_1.logger.info({ clinicaId, dias, count: lotes.length }, `⚠️ ${lotes.length} lotes com validade próxima`);
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
            logger_1.logger.info({ clinicaId, count: lotes.length }, '✅ Job de validade próxima concluído');
        }
        catch (err) {
            logger_1.logger.error({ err, clinicaId }, '❌ Erro ao processar job de validade próxima');
            throw err;
        }
    });
}, {
    connection: redis_1.redis,
    concurrency: 3,
});
/**
 * Worker para cálculo de analytics em background
 */
exports.analyticsWorker = new bullmq_1.Worker(exports.ESTOQUE_JOB_NAMES.ANALYTICS, async (job) => {
    const { clinicaId, dataInicio, dataFim } = job.data;
    const lockKey = `estoque:analytics:${clinicaId}`;
    logger_1.logger.info({ clinicaId, jobId: job.id }, '⚙️ Processando job de analytics');
    return (0, locks_1.withLock)(lockKey, 60000, async () => {
        try {
            // 1. Calcular KPIs e salvar em cache
            const { analyticsEstoqueService } = await Promise.resolve().then(() => __importStar(require('@clinicaplus/api/src/services/analytics.estoque.service')));
            const kpis = await analyticsEstoqueService.getKpis({ clinicaId, dataInicio, dataFim });
            // 2. Salvar no cache Redis
            const cacheKey = `estoque:analytics:kpis:${clinicaId}`;
            await redis_1.redis.setex(cacheKey, 600, JSON.stringify(kpis)); // 10 minutos
            logger_1.logger.info({ clinicaId }, '✅ Job de analytics concluído');
        }
        catch (err) {
            logger_1.logger.error({ err, clinicaId }, '❌ Erro ao processar job de analytics');
            throw err;
        }
    });
}, {
    connection: redis_1.redis,
    concurrency: 2,
});
// Event handlers
exports.estoqueMinimoWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id }, '🏁 Job de estoque mínimo concluído');
});
exports.estoqueMinimoWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err }, '💥 Job de estoque mínimo falhou');
});
exports.validadeProximaWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id }, '🏁 Job de validade próxima concluído');
});
exports.validadeProximaWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err }, '💥 Job de validade próxima falhou');
});
exports.analyticsWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id }, '🏁 Job de analytics concluído');
});
exports.analyticsWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err }, '💥 Job de analytics falhou');
});
