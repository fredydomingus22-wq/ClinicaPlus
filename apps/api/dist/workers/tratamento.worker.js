"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tratamentoWorker = void 0;
const bullmq_1 = require("bullmq");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const events_1 = require("@clinicaplus/events");
const redis_1 = require("../lib/redis");
const date_fns_1 = require("date-fns");
/**
 * Worker para processar tarefas relacionadas a tratamentos.
 * Atualmente responsável por gerar sessões automáticas a partir de um plano.
 */
exports.tratamentoWorker = new bullmq_1.Worker(events_1.JobNames.TRATAMENTO_GERAR_SESSOES, async (job) => {
    const { planoId, clinicaId } = job.data;
    logger_1.logger.info({ planoId, clinicaId, jobId: job.id }, '⚙️ Processando job de geração de sessões');
    try {
        // 1. Buscar o plano com detalhes
        const plano = await prisma_1.prisma.planoTratamento.findUnique({
            where: { id: planoId, clinicaId },
            include: { tipoTratamento: true }
        });
        if (!plano) {
            logger_1.logger.error({ planoId, clinicaId }, '❌ Plano não encontrado para o worker');
            return;
        }
        // 2. Idempotência: Verificar se já existem sessões
        const sessoesExistentes = await prisma_1.prisma.sessaoTratamento.count({
            where: { planoId, clinicaId }
        });
        if (sessoesExistentes > 0) {
            logger_1.logger.warn({ planoId, clinicaId }, '⚠️ Sessões já existem para este plano. Ignorando.');
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
            const dataSessao = (0, date_fns_1.addDays)(new Date(dataInicio), (i - 1) * diasIntervalo);
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
        await prisma_1.prisma.sessaoTratamento.createMany({
            // @ts-expect-error - Prisma createMany data type is sometimes finicky in monorepos
            data: sessoes
        });
        logger_1.logger.info({ planoId, count: sessoes.length }, '✅ Sessões geradas com sucesso');
    }
    catch (err) {
        logger_1.logger.error({ err, planoId }, '❌ Erro ao gerar sessões no worker');
        throw err; // Re-throw para o BullMQ tentar novamente se configurado
    }
}, {
    connection: redis_1.redis,
    concurrency: 5
});
exports.tratamentoWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id }, '🏁 Job de tratamento concluído');
});
exports.tratamentoWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err }, '💥 Job de tratamento falhou');
});
