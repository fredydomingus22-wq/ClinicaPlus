"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarSessoesWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const logger_1 = require("../lib/logger");
const prisma_1 = require("../lib/prisma");
const events_1 = require("@clinicaplus/events");
/**
 * Worker para geração automática de sessões de tratamento.
 * Consumido quando um PlanoTratamento é criado com status ACTIVO.
 */
exports.criarSessoesWorker = new bullmq_1.Worker(events_1.JobNames.TRATAMENTO_GERAR_SESSOES, async (job) => {
    const log = logger_1.logger.child({ jobId: job.id, planoId: job.data.planoId });
    log.info('Processing criar-sessoes job');
    const plano = await prisma_1.prisma.planoTratamento.findFirst({
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
    const sessoesExistentes = await prisma_1.prisma.sessaoTratamento.count({
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
            estado: 'AGENDADO',
            dataHora: dataSessao
        };
    });
    await prisma_1.prisma.sessaoTratamento.createMany({ data: sessoes });
    log.info({ criadas: sessoesACriar, total: totalSessoes }, '✅ Sessões de tratamento criadas');
}, {
    connection: redis_1.redis,
    concurrency: 5,
});
exports.criarSessoesWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, planoId: job?.data?.planoId, err: err.message }, 'criar-sessoes job failed');
});
exports.criarSessoesWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, planoId: job.data.planoId }, 'criar-sessoes job completed');
});
