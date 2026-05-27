"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessoesService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const client_1 = require("@prisma/client");
const auditLog_service_1 = require("./auditLog.service");
const TRANSICOES = {
    AGENDADO: ['REALIZADO', 'FALTOU', 'CANCELADO'],
    FALTOU: ['AGENDADO'],
    REALIZADO: [],
    CANCELADO: [],
};
function assertSessaoTransicaoValida(actual, destino) {
    const validas = TRANSICOES[actual];
    if (!validas.includes(destino)) {
        throw new AppError_1.AppError(`Não é possível passar de "${actual}" para "${destino}"`, 400);
    }
}
exports.sessoesService = {
    /**
     * Lista todas as sessões de um plano de tratamento específico
     */
    async listByPlano(clinicaId, planoId) {
        // Validar se o plano existe e pertence à clínica
        const plano = await prisma_1.prisma.planoTratamento.findFirst({
            where: { id: planoId, clinicaId }
        });
        if (!plano) {
            throw new AppError_1.AppError('Plano de tratamento não encontrado', 404);
        }
        const sessoes = await prisma_1.prisma.sessaoTratamento.findMany({
            where: {
                planoId,
                clinicaId
            },
            orderBy: { numeroSessao: 'asc' },
            include: {
                agendamento: true,
            }
        });
        return { data: sessoes };
    },
    /**
     * Atualiza uma sessão (estado, notas, etc)
     */
    async update(clinicaId, sessaoId, data, userId = 'SISTEMA') {
        const sessao = await prisma_1.prisma.sessaoTratamento.findFirst({
            where: { id: sessaoId, clinicaId }
        });
        if (!sessao) {
            throw new AppError_1.AppError('Sessão de tratamento não encontrada', 404);
        }
        if (data.estado) {
            assertSessaoTransicaoValida(sessao.estado, data.estado);
        }
        const updated = await prisma_1.prisma.sessaoTratamento.update({
            where: { id: sessaoId },
            data: {
                ...(data.estado !== undefined ? { estado: data.estado } : {}),
                ...(data.notas !== undefined ? { notas: data.notas } : {}),
                ...(data.dataHora !== undefined ? { dataHora: data.dataHora } : {})
            }
        });
        // Lógica de conclusão automática do plano
        if (data.estado === 'REALIZADO') {
            const planoId = sessao.planoId;
            const totalSessoes = await prisma_1.prisma.sessaoTratamento.count({
                where: { planoId, clinicaId },
            });
            const sessoesRealizadas = await prisma_1.prisma.sessaoTratamento.count({
                where: { planoId, clinicaId, estado: 'REALIZADO' },
            });
            if (sessoesRealizadas >= totalSessoes) {
                await prisma_1.prisma.planoTratamento.update({
                    where: { id: planoId },
                    data: { estado: client_1.EstadoPlano.CONCLUIDO, dataFimReal: new Date() },
                });
                await auditLog_service_1.auditLogService.log({
                    actorId: userId,
                    accao: 'UPDATE',
                    recurso: 'PlanoTratamento',
                    recursoId: planoId,
                    depois: { estado: 'CONCLUIDO' },
                    clinicaId,
                });
            }
        }
        return { data: updated };
    }
};
