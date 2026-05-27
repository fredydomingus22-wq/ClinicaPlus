"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prontuariosService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
exports.prontuariosService = {
    /**
     * Lists medical records for a patient.
     */
    async listByPaciente(clinicaId, pacienteId) {
        const records = await prisma_1.prisma.prontuario.findMany({
            where: { clinicaId, pacienteId },
            orderBy: { criadoEm: 'desc' },
        });
        return records.map(r => ({
            ...r,
            criadoEm: r.criadoEm.toISOString(),
            atualizadoEm: r.atualizadoEm.toISOString(),
        }));
    },
    /**
     * Creates a new medical record entry.
     */
    async create(clinicaId, data) {
        const record = await prisma_1.prisma.prontuario.create({
            data: {
                clinicaId,
                pacienteId: data.pacienteId,
                medicoId: data.medicoId,
                agendamentoId: data.agendamentoId ?? null,
                notas: data.notas,
                diagnostico: data.diagnostico ?? null,
            }
        });
        return {
            ...record,
            criadoEm: record.criadoEm.toISOString(),
            atualizadoEm: record.atualizadoEm.toISOString(),
        };
    },
    /**
     * Gets a specific medical record.
     */
    async getOne(id, clinicaId) {
        const record = await prisma_1.prisma.prontuario.findUnique({
            where: { id }
        });
        if (!record || record.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Prontuário não encontrado', 404, 'NOT_FOUND');
        }
        return {
            ...record,
            criadoEm: record.criadoEm.toISOString(),
            atualizadoEm: record.atualizadoEm.toISOString(),
        };
    }
};
