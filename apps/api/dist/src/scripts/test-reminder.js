"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queues_1 = require("../lib/queues");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
async function runTest() {
    logger_1.logger.info('🚀 Iniciando script de teste de lembretes...');
    try {
        // 1. Encontra o agendamento CONFIRMADO mais recente que tenha um paciente com email
        const ag = await prisma_1.prisma.agendamento.findFirst({
            where: {
                estado: 'CONFIRMADO',
                paciente: {
                    email: { not: null }
                }
            },
            orderBy: { criadoEm: 'desc' },
            include: {
                paciente: true
            }
        });
        if (!ag) {
            logger_1.logger.error('❌ Nenhum agendamento CONFIRMADO com email de paciente encontrado para teste.');
            process.exit(1);
        }
        logger_1.logger.info({ agendamentoId: ag.id, paciente: ag.paciente.nome, email: ag.paciente.email }, '✅ Agendamento encontrado para teste.');
        // 2. Adiciona à fila de agendamento (isto simula o disparo que o cron faria)
        // O reminderWorker vai pegar nisto e transformar num emailJob
        const jobId = `test-reminder-schedule-${ag.id}-${Date.now()}`;
        await queues_1.reminderQueue.add('reminder-schedule', {
            agendamentoId: ag.id,
            tipo: '24h'
        }, {
            jobId,
            removeOnComplete: true
        });
        logger_1.logger.info({ jobId }, '✅ Job de teste adicionado à fila reminderQueue (cp-reminders-schedule).');
        logger_1.logger.info('Aguarde alguns segundos e verifique os logs do Worker para confirmação de envio.');
        // Pequena pausa para garantir que o job foi registado antes de encerrar o script
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.exit(0);
    }
    catch (err) {
        logger_1.logger.error({ err }, '❌ Erro ao executar script de teste');
        process.exit(1);
    }
}
runTest();
