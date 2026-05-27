"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobWaTratamentoAtualizacao = jobWaTratamentoAtualizacao;
exports.jobWaTratamentoProgresso = jobWaTratamentoProgresso;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const axios_1 = __importDefault(require("axios"));
/**
 * Job para enviar notificações de atualização de planos de tratamento
 */
async function jobWaTratamentoAtualizacao() {
    const log = logger_1.logger.child({ job: 'wa-tratamento-atualizacao' });
    log.info('Iniciando ciclo de notificações de tratamento');
    try {
        // Busca planos de tratamento com sessões agendadas para as próximas 24h
        const agora = new Date();
        const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
        const planos = await prisma_1.prisma.planoTratamento.findMany({
            where: {
                estado: 'ACTIVO',
                sessoes: {
                    some: {
                        dataHora: {
                            gte: agora,
                            lte: amanha,
                        },
                        estado: 'AGENDADO',
                    },
                },
                paciente: { telefone: { not: null } },
            },
            include: {
                paciente: true,
                medico: true,
                clinica: {
                    include: {
                        waInstancias: {
                            include: {
                                automacoes: {
                                    where: {
                                        ativo: true,
                                    },
                                },
                            },
                        },
                    },
                },
                sessoes: {
                    where: {
                        dataHora: {
                            gte: agora,
                            lte: amanha,
                        },
                        estado: 'AGENDADO',
                    },
                    orderBy: {
                        dataHora: 'asc',
                    },
                    take: 1,
                },
            },
        });
        log.info({ count: planos.length }, 'Planos de tratamento com sessões agendadas encontrados');
        let enviados = 0;
        let falhas = 0;
        for (const plano of planos) {
            const instancia = plano.clinica.waInstancias[0];
            if (!instancia || instancia.automacoes.length === 0)
                continue;
            const proximaSessao = plano.sessoes[0];
            if (!proximaSessao)
                continue;
            try {
                // Chama API interna para enviar notificação
                await axios_1.default.post(`${process.env.API_URL || 'http://localhost:3000'}/api/whatsapp/tratamento-sessao`, {
                    planoId: plano.id,
                }, {
                    headers: {
                        'x-api-key': process.env.WORKER_API_KEY || 'worker-key',
                    },
                });
                enviados++;
            }
            catch (error) {
                log.error({ planoId: plano.id, error }, 'Falha ao enviar notificação de tratamento');
                falhas++;
            }
        }
        log.info({ enviados, falhas }, 'Ciclo de notificações de tratamento concluído');
    }
    catch (err) {
        log.error({ err }, 'Falha fatal no job de notificações de tratamento');
        throw err;
    }
}
/**
 * Job para enviar notificações de progresso de tratamento (semanal)
 */
async function jobWaTratamentoProgresso() {
    const log = logger_1.logger.child({ job: 'wa-tratamento-progresso' });
    log.info('Iniciando ciclo de notificações de progresso');
    try {
        // Busca planos de tratamento ativos com progresso significativo
        const planos = await prisma_1.prisma.planoTratamento.findMany({
            where: {
                estado: 'ACTIVO',
                totalSessoes: { gt: 0 },
                paciente: { telefone: { not: null } },
            },
            include: {
                paciente: true,
                medico: true,
                clinica: {
                    include: {
                        waInstancias: {
                            include: {
                                automacoes: {
                                    where: {
                                        ativo: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        log.info({ count: planos.length }, 'Planos de tratamento ativos encontrados');
        let enviados = 0;
        let falhas = 0;
        for (const plano of planos) {
            const instancia = plano.clinica.waInstancias[0];
            if (!instancia || instancia.automacoes.length === 0)
                continue;
            try {
                // TODO: Implementar envio via API ou serviço compartilhado
                log.info({ planoId: plano.id }, 'Notificação de progresso seria enviada aqui');
                enviados++;
            }
            catch (error) {
                log.error({ planoId: plano.id, error }, 'Falha ao enviar notificação de progresso');
                falhas++;
            }
        }
        log.info({ enviados, falhas }, 'Ciclo de notificações de progresso concluído');
    }
    catch (err) {
        log.error({ err }, 'Falha fatal no job de notificações de progresso');
        throw err;
    }
}
