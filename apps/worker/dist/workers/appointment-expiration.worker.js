"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentExpirationWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const logger_1 = require("../lib/logger");
const prisma_1 = require("../lib/prisma");
const events_1 = require("@clinicaplus/events");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
// Configurar extensões do DayJS
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
const logger = logger_1.logger.child({ worker: 'appointment-expiration' });
/**
 * Worker para processar expirações de agendamentos e No-Shows.
 * Corre a cada 30 minutos via scheduler ou a pedido.
 */
exports.appointmentExpirationWorker = new bullmq_1.Worker(events_1.JobNames.APPOINTMENT_EXPIRATION, async (job) => {
    const now = (0, dayjs_1.default)().tz('Africa/Luanda');
    logger.info({
        jobId: job.id,
        now: now.format(),
        nowUtc: now.utc().format()
    }, 'Iniciando varredura de Agendamentos Expirados e No-Show');
    try {
        // 1. Encontrar agendamentos PENDENTE/CONFIRMADO que já deveriam ter terminado
        // Comparamos em UTC para ser exacto com o Prisma
        const overdueThreshold = now.utc().toDate();
        const candidates = await prisma_1.prisma.agendamento.findMany({
            where: {
                estado: { in: ['PENDENTE', 'CONFIRMADO'] },
                dataHora: { lt: overdueThreshold },
            },
            include: {
                medico: { include: { utilizador: true } },
                paciente: true
            }
        });
        logger.info({ countFound: candidates.length }, 'Candidatos a expiração encontrados');
        let lateCount = 0;
        let noShowCount = 0;
        for (const ag of candidates) {
            // Cálculo do fim: Data de início + duração em minutos
            const appointmentEnd = (0, dayjs_1.default)(ag.dataHora).add(ag.duracao, 'minute');
            // Se o tempo actual já passou do fim previsto
            if (now.utc().isAfter(appointmentEnd)) {
                logger.debug({ agendamentoId: ag.id }, 'Marcando como ATRASADO');
                await prisma_1.prisma.agendamento.update({
                    where: { id: ag.id },
                    data: { estado: 'ATRASADO' }
                });
                lateCount++;
                // Notificar Médico
                if (ag.medico?.utilizadorId) {
                    await prisma_1.prisma.notificacao.create({
                        data: {
                            utilizadorId: ag.medico.utilizadorId,
                            titulo: 'Agendamento Atrasado',
                            mensagem: `O paciente ${ag.paciente?.nome || 'Inominado'} não compareceu à hora marcada (${(0, dayjs_1.default)(ag.dataHora).format('HH:mm')}).`,
                            tipo: 'AVISO',
                        }
                    });
                }
            }
        }
        // 2. Transição de ATRASADO para NAO_COMPARECEU (Fechar o dia)
        // Agendamentos em estado ATRASADO cujo dia da consulta já terminou localmente em Angola
        const markedLate = await prisma_1.prisma.agendamento.findMany({
            where: { estado: 'ATRASADO' }
        });
        for (const ag of markedLate) {
            // Se a data da consulta (dia) for ANTERIOR ao dia de hoje em Luanda, marcamos como No-Show definitivo
            const appointmentDay = (0, dayjs_1.default)(ag.dataHora).tz('Africa/Luanda').startOf('day');
            const todayLuanda = now.startOf('day');
            if (todayLuanda.isAfter(appointmentDay)) {
                logger.debug({ agendamentoId: ag.id }, 'Transitando ATRASADO -> NAO_COMPARECEU');
                await prisma_1.prisma.agendamento.update({
                    where: { id: ag.id },
                    data: { estado: 'NAO_COMPARECEU' }
                });
                noShowCount++;
            }
        }
        logger.info({ lateCount, noShowCount }, 'Varredura de Agendamentos concluída com sucesso');
        if (lateCount > 0 || noShowCount > 0) {
            logger.info(`Resumo do Job: ${lateCount} marcados como ATRASADO, ${noShowCount} marcados como NÃO COMPARECEU.`);
        }
        else {
            logger.info('Nenhum agendamento precisou de actualização de estado nesta execução.');
        }
        return { lateCount, noShowCount };
    }
    catch (error) {
        logger.error({ error }, 'Falha a varrer agendamentos');
        throw error;
    }
}, {
    connection: redis_1.redis,
    concurrency: 1
});
exports.appointmentExpirationWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Falha cronjob appointment-expiration');
});
