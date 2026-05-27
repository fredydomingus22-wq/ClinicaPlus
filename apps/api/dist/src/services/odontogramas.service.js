"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OdontogramaService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const types_1 = require("@clinicaplus/types");
function toDto(record) {
    const raw = Array.isArray(record.marcacoes) ? record.marcacoes : [];
    const marcacoes = raw.map((m) => types_1.OdontogramaMarcacaoSchema.parse(m));
    return {
        id: record.id,
        clinicaId: record.clinicaId,
        pacienteId: record.pacienteId,
        medicoId: record.medicoId,
        agendamentoId: record.agendamentoId,
        marcacoes,
        criadoEm: record.criadoEm.toISOString(),
        atualizadoEm: record.atualizadoEm.toISOString(),
    };
}
async function assertAgendamentoContext(clinicaId, agendamentoId, pacienteId, medicoId) {
    const agendamento = await prisma_1.prisma.agendamento.findFirst({
        where: { id: agendamentoId, clinicaId },
    });
    if (!agendamento) {
        throw new AppError_1.AppError('Agendamento não encontrado', 404, 'AGENDAMENTO_NOT_FOUND');
    }
    if (agendamento.pacienteId !== pacienteId) {
        throw new AppError_1.AppError('Paciente não corresponde ao agendamento', 400, 'PACIENTE_MISMATCH');
    }
    if (agendamento.medicoId !== medicoId) {
        throw new AppError_1.AppError('Médico não corresponde ao agendamento', 403, 'MEDICO_MISMATCH');
    }
}
class OdontogramaService {
    static async create(clinicaId, data) {
        await assertAgendamentoContext(clinicaId, data.agendamentoId, data.pacienteId, data.medicoId);
        const existing = await prisma_1.prisma.odontograma.findFirst({
            where: { clinicaId, agendamentoId: data.agendamentoId },
        });
        if (existing) {
            const updated = await prisma_1.prisma.odontograma.update({
                where: { id: existing.id },
                data: {
                    marcacoes: data.marcacoes,
                    atualizadoEm: new Date(),
                },
            });
            return toDto(updated);
        }
        const created = await prisma_1.prisma.odontograma.create({
            data: {
                clinicaId,
                pacienteId: data.pacienteId,
                medicoId: data.medicoId,
                agendamentoId: data.agendamentoId,
                marcacoes: data.marcacoes,
            },
        });
        return toDto(created);
    }
    static async update(clinicaId, id, data) {
        const existing = await prisma_1.prisma.odontograma.findFirst({
            where: { id, clinicaId },
        });
        if (!existing) {
            throw new AppError_1.AppError('Odontograma não encontrado', 404, 'ODONTOGRAMA_NOT_FOUND');
        }
        const updated = await prisma_1.prisma.odontograma.update({
            where: { id },
            data: {
                marcacoes: data.marcacoes,
                atualizadoEm: new Date(),
            },
        });
        return toDto(updated);
    }
    static async getByAgendamento(clinicaId, agendamentoId) {
        const record = await prisma_1.prisma.odontograma.findFirst({
            where: { clinicaId, agendamentoId },
        });
        return record ? toDto(record) : null;
    }
    static async getByPaciente(clinicaId, pacienteId) {
        const records = await prisma_1.prisma.odontograma.findMany({
            where: { clinicaId, pacienteId },
            orderBy: { criadoEm: 'desc' },
        });
        return records.map(toDto);
    }
    static async list(clinicaId, pacienteId, limit) {
        const where = { clinicaId };
        if (pacienteId) {
            where.pacienteId = pacienteId;
        }
        const findManyArgs = {
            where,
            orderBy: { criadoEm: 'desc' },
            include: {
                paciente: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
                agendamento: {
                    select: {
                        id: true,
                        dataHora: true,
                    },
                },
            },
            ...(limit !== undefined ? { take: limit } : {}),
        };
        const records = await prisma_1.prisma.odontograma.findMany(findManyArgs);
        return records.map((record) => ({
            ...toDto(record),
            paciente: record.paciente,
            agendamento: record.agendamento,
        }));
    }
    static async getById(clinicaId, id) {
        const record = await prisma_1.prisma.odontograma.findFirst({
            where: { id, clinicaId },
        });
        if (!record) {
            throw new AppError_1.AppError('Odontograma não encontrado', 404, 'ODONTOGRAMA_NOT_FOUND');
        }
        return toDto(record);
    }
    /** Substitui ou insere uma marcação por par dente+face */
    static mergeMarcacao(marcacoes, nova) {
        const parsed = types_1.OdontogramaMarcacaoSchema.parse(nova);
        const filtered = marcacoes.filter((m) => !(m.numeroDente === parsed.numeroDente && m.face === parsed.face));
        if (parsed.status === 'SAUDAVEL') {
            return filtered;
        }
        return [...filtered, parsed];
    }
}
exports.OdontogramaService = OdontogramaService;
