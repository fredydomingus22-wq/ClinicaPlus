"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnamneseService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../lib/AppError");
const prisma = new client_1.PrismaClient();
class AnamneseService {
    /**
     * Cria uma nova anamnese para um paciente e agendamento.
     */
    static async create(clinicaId, data) {
        // Verificar se já existe anamnese para este agendamento
        if (data.agendamentoId) {
            const existing = await prisma.anamnese.findFirst({
                where: {
                    clinicaId,
                    agendamentoId: data.agendamentoId
                }
            });
            if (existing) {
                return prisma.anamnese.update({
                    where: { id: existing.id },
                    data: {
                        respostas: data.respostas,
                        atualizadoEm: new Date(),
                    }
                });
            }
        }
        try {
            return await prisma.anamnese.create({
                data: {
                    ...data,
                    agendamentoId: data.agendamentoId ?? null,
                    clinicaId,
                }
            });
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                if (data.agendamentoId) {
                    const existing = await prisma.anamnese.findFirst({
                        where: {
                            clinicaId,
                            agendamentoId: data.agendamentoId
                        }
                    });
                    if (existing) {
                        return prisma.anamnese.update({
                            where: { id: existing.id },
                            data: {
                                respostas: data.respostas,
                                atualizadoEm: new Date(),
                            }
                        });
                    }
                }
            }
            throw err;
        }
    }
    /**
     * Atualiza as respostas de uma anamnese existente.
     */
    static async update(clinicaId, id, data) {
        const anamnese = await prisma.anamnese.findFirst({
            where: { id, clinicaId }
        });
        if (!anamnese) {
            throw new AppError_1.AppError('Anamnese não encontrada', 404);
        }
        return prisma.anamnese.update({
            where: { id },
            data: {
                respostas: data.respostas,
                atualizadoEm: new Date(),
            }
        });
    }
    /**
     * Busca anamnese por agendamento.
     */
    static async getByAgendamento(clinicaId, agendamentoId) {
        return prisma.anamnese.findFirst({
            where: {
                clinicaId,
                agendamentoId
            }
        });
    }
    /**
     * Busca histórico de anamneses do paciente.
     */
    static async getByPaciente(clinicaId, pacienteId) {
        return prisma.anamnese.findMany({
            where: {
                clinicaId,
                pacienteId
            },
            orderBy: { criadoEm: 'desc' },
            include: {
                medico: {
                    select: {
                        nome: true,
                    }
                }
            }
        });
    }
    /**
     * Busca uma anamnese específica por ID.
     */
    static async getById(clinicaId, id) {
        const anamnese = await prisma.anamnese.findFirst({
            where: { id, clinicaId },
            include: {
                paciente: true,
                medico: true,
                agendamento: true,
            }
        });
        if (!anamnese) {
            throw new AppError_1.AppError('Anamnese não encontrada', 404);
        }
        return anamnese;
    }
}
exports.AnamneseService = AnamneseService;
