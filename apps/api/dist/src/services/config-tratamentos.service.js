"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tratamentosConfigService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
exports.tratamentosConfigService = {
    // --- TIPOS DE EXAMES ---
    async listTiposExame(clinicaId) {
        return prisma_1.prisma.tipoExameClinica.findMany({
            where: { clinicaId, ativo: true },
            orderBy: { nome: 'asc' },
        });
    },
    async createTipoExame(clinicaId, data) {
        try {
            const { nome, descricao, ativo } = data;
            return await prisma_1.prisma.tipoExameClinica.create({
                data: {
                    clinicaId,
                    nome,
                    descricao: descricao ?? null,
                    preco: data.preco ?? 0,
                    ativo: ativo ?? true,
                },
            });
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
                throw new AppError_1.AppError('Já existe um tipo de exame com este nome nesta clínica', 400);
            }
            throw error;
        }
    },
    // --- TIPOS DE TRATAMENTO ---
    async listTiposTratamento(clinicaId) {
        return prisma_1.prisma.tipoTratamento.findMany({
            where: { clinicaId, ativo: true },
            orderBy: { nome: 'asc' },
        });
    },
    async createTipoTratamento(clinicaId, data) {
        try {
            const { nome, descricao, duracaoMin, ativo } = data;
            return await prisma_1.prisma.tipoTratamento.create({
                data: {
                    clinicaId,
                    nome,
                    descricao: descricao ?? null,
                    duracaoMin: duracaoMin ?? null,
                    preco: data.preco ?? 0,
                    ativo: ativo ?? true,
                },
            });
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
                throw new AppError_1.AppError('Já existe um tipo de tratamento com este nome nesta clínica', 400);
            }
            throw error;
        }
    },
};
