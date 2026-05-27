"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.especialidadesService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
exports.especialidadesService = {
    async list(clinicaId, query) {
        const { q, page = 1, limit = 20, ativo } = query;
        const where = {
            clinicaId,
            ...(ativo !== undefined && { ativo }),
            ...(q && {
                nome: { contains: q, mode: 'insensitive' }
            })
        };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.especialidade.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { nome: 'asc' }
            }),
            prisma_1.prisma.especialidade.count({ where })
        ]);
        return {
            items: items.map(toDTO),
            total,
            page,
            limit
        };
    },
    async getOne(id, clinicaId) {
        const esp = await prisma_1.prisma.especialidade.findUnique({ where: { id } });
        if (!esp || esp.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Especialidade não encontrada', 404, 'NOT_FOUND');
        }
        return toDTO(esp);
    },
    async create(data, clinicaId) {
        const esp = await prisma_1.prisma.especialidade.create({
            data: {
                clinicaId,
                nome: data.nome,
                descricao: data.descricao ?? null, // Ensure descricao is null if undefined
                ativo: data.ativo ?? true, // Default to true if undefined
            }
        });
        return toDTO(esp);
    },
    async update(id, data, clinicaId) {
        const existing = await prisma_1.prisma.especialidade.findUnique({ where: { id } });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Especialidade não encontrada', 404, 'NOT_FOUND');
        }
        const updateData = {};
        if (data.nome !== undefined)
            updateData.nome = data.nome;
        if (data.descricao !== undefined)
            updateData.descricao = data.descricao ?? null;
        if (data.ativo !== undefined)
            updateData.ativo = data.ativo;
        const updated = await prisma_1.prisma.especialidade.update({
            where: { id },
            data: updateData
        });
        return toDTO(updated);
    },
    async delete(id, clinicaId) {
        const existing = await prisma_1.prisma.especialidade.findUnique({
            where: { id },
            include: { _count: { select: { medicos: true } } }
        });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Especialidade não encontrada', 404, 'NOT_FOUND');
        }
        if (existing._count.medicos > 0) {
            throw new AppError_1.AppError('Não é possível remover uma especialidade que possui médicos vinculados. Desative-a em vez disso.', 400, 'PROTECTED_RELATION');
        }
        await prisma_1.prisma.especialidade.delete({ where: { id } });
    }
};
function toDTO(esp) {
    return {
        id: esp.id,
        clinicaId: esp.clinicaId,
        nome: esp.nome,
        descricao: esp.descricao,
        ativo: esp.ativo,
        criadoEm: esp.criadoEm.toISOString(),
        atualizadoEm: esp.atualizadoEm.toISOString()
    };
}
