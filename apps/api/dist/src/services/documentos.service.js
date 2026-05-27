"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentosService = void 0;
const prisma_1 = require("../lib/prisma");
exports.documentosService = {
    /**
     * Lists documents for a patient.
     */
    async listByPaciente(clinicaId, pacienteId) {
        const records = await prisma_1.prisma.documento.findMany({
            where: { clinicaId, pacienteId },
            orderBy: { criadoEm: 'desc' },
        });
        return records.map(r => ({
            ...r,
            tipo: r.tipo,
            criadoEm: r.criadoEm.toISOString(),
        }));
    },
    /**
     * Adds a document reference.
     */
    async create(clinicaId, data) {
        const record = await prisma_1.prisma.documento.create({
            data: {
                clinicaId,
                pacienteId: data.pacienteId,
                medicoId: data.medicoId ?? null,
                agendamentoId: data.agendamentoId ?? null,
                tipo: data.tipo,
                nome: data.nome,
                url: data.url,
            }
        });
        return {
            ...record,
            tipo: record.tipo,
            criadoEm: record.criadoEm.toISOString(),
        };
    }
};
