"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planosService = void 0;
const prisma_1 = require("../lib/prisma");
const queues_1 = require("../lib/queues");
const events_1 = require("@clinicaplus/events");
const AppError_1 = require("../lib/AppError");
exports.planosService = {
    /**
     * Cria um novo plano de tratamento.
     * Nota: A criação de sessões será delegada a um worker via BullMQ na Sprint II.
     */
    async create(clinicaId, data) {
        const { pacienteId, medicoId, tipoId, totalSessoes, frequenciaSemana, dataInicio, descricao, observacoes, agendamentoOrigemId, responsavelId } = data;
        // Cálculo simples de data de fim prevista (Sprint I)
        const semanas = Math.ceil(totalSessoes / frequenciaSemana);
        const dataFimPrevista = new Date(dataInicio);
        dataFimPrevista.setDate(dataFimPrevista.getDate() + (semanas * 7));
        return prisma_1.prisma.$transaction(async (tx) => {
            const plano = await tx.planoTratamento.create({
                data: {
                    clinicaId,
                    pacienteId,
                    medicoId,
                    tipoId,
                    totalSessoes,
                    frequenciaSemana,
                    dataInicio,
                    dataFimPrevista,
                    descricao: descricao ?? null,
                    observacoes: observacoes ?? null,
                    agendamentoOrigemId: agendamentoOrigemId ?? null,
                    responsavelId: responsavelId ?? null,
                    estado: 'ACTIVO'
                },
                include: { tipoTratamento: true, paciente: true }
            });
            // Sprint II: Disparar Job BullMQ para gerar as sessões na base de dados
            await queues_1.tratamentoQueue.add(events_1.JobNames.TRATAMENTO_GERAR_SESSOES, { planoId: plano.id, clinicaId }, { jobId: `${plano.id}_creation_job` } // Idempotência
            );
            return plano;
        });
    },
    /**
     * Procura um plano específico com detalhes
     */
    async getById(clinicaId, id) {
        const plano = await prisma_1.prisma.planoTratamento.findFirst({
            where: { id, clinicaId },
            include: {
                tipoTratamento: true,
                paciente: { select: { id: true, nome: true, numeroPaciente: true } },
                medico: { select: { id: true, nome: true } },
                sessoes: {
                    orderBy: { numeroSessao: 'asc' },
                    include: { agendamento: true }
                }
            }
        });
        if (!plano) {
            throw new AppError_1.AppError('Plano de tratamento não encontrado', 404);
        }
        return plano;
    },
    /**
     * Lists all treatment plans for a clinic with optional filters.
     */
    async listAll(clinicaId, filters) {
        const planos = await prisma_1.prisma.planoTratamento.findMany({
            where: {
                clinicaId,
                ...(filters.estado ? { estado: filters.estado } : {}),
                ...(filters.q ? {
                    OR: [
                        { paciente: { nome: { contains: filters.q, mode: 'insensitive' } } },
                        { tipoTratamento: { nome: { contains: filters.q, mode: 'insensitive' } } },
                        { descricao: { contains: filters.q, mode: 'insensitive' } }
                    ]
                } : {})
            },
            include: {
                tipoTratamento: true,
                paciente: { select: { id: true, nome: true, numeroPaciente: true } },
                _count: { select: { sessoes: true } }
            },
            orderBy: { criadoEm: 'desc' },
        });
        if (planos.length === 0)
            return [];
        // Buscar contagem de sessões realizadas de forma eficiente
        const realizedCounts = await prisma_1.prisma.sessaoTratamento.groupBy({
            by: ['planoId'],
            where: {
                planoId: { in: planos.map(p => p.id) },
                estado: 'REALIZADO'
            },
            _count: { id: true }
        });
        const countMap = new Map(realizedCounts.map(c => [c.planoId, c._count.id]));
        return planos.map(p => ({
            ...p,
            sessoesRealizadas: countMap.get(p.id) || 0
        }));
    },
    /**
     * Lists all treatment plans for a specific patient.
     * Scoped to clinicId.
     */
    async listByPaciente(clinicaId, pacienteId) {
        const planos = await prisma_1.prisma.planoTratamento.findMany({
            where: { clinicaId, pacienteId },
            include: {
                tipoTratamento: true,
                medico: { select: { id: true, nome: true } },
                _count: { select: { sessoes: true } },
                sessoes: {
                    select: { id: true, estado: true, numeroSessao: true, dataHora: true }
                }
            },
            orderBy: { criadoEm: 'desc' }
        });
        return planos.map(p => ({
            ...p,
            sessoesRealizadas: p.sessoes.filter(s => s.estado === 'REALIZADO').length
        }));
    },
    async update(clinicaId, id, data) {
        return prisma_1.prisma.planoTratamento.update({
            where: { id, clinicaId },
            data: data,
            include: { tipoTratamento: true }
        });
    }
};
