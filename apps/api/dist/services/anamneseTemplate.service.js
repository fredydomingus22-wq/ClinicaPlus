"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anamneseTemplateService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const client_1 = require("@prisma/client");
const types_1 = require("@clinicaplus/types");
exports.anamneseTemplateService = {
    async getByEspecialidade(clinicaId, especialidadeId) {
        const existing = await prisma_1.prisma.anamneseTemplate.findFirst({
            where: { clinicaId, especialidadeId },
            include: { questoes: { orderBy: { ordem: 'asc' } } },
        });
        if (existing)
            return existing;
        const especialidade = await prisma_1.prisma.especialidade.findFirst({
            where: { id: especialidadeId, clinicaId },
        });
        if (!especialidade) {
            throw new AppError_1.AppError('Especialidade nao encontrada para esta clinica', 404);
        }
        const templateKey = toTemplateKey(especialidade.nome);
        const questoesBase = types_1.ANAMNESE_TEMPLATES[templateKey];
        if (!questoesBase || questoesBase.length === 0) {
            throw new AppError_1.AppError('Template nao encontrado para esta especialidade', 404);
        }
        const created = await prisma_1.prisma.anamneseTemplate.create({
            data: {
                clinicaId,
                especialidadeId,
                titulo: `Template de ${especialidade.nome}`,
                questoes: {
                    create: questoesBase.map((q, index) => ({
                        ordem: index + 1,
                        pergunta: q.label,
                        tipoResposta: q.tipo,
                        options: q.opcoes ? q.opcoes : client_1.Prisma.JsonNull,
                    })),
                },
            },
            include: { questoes: { orderBy: { ordem: 'asc' } } },
        });
        return created;
    },
    async create(clinicaId, especialidadeId, titulo, questoes) {
        const exists = await prisma_1.prisma.anamneseTemplate.findFirst({
            where: { clinicaId, especialidadeId },
        });
        if (exists) {
            throw new AppError_1.AppError('Template ja existe para esta especialidade', 400);
        }
        return prisma_1.prisma.anamneseTemplate.create({
            data: {
                clinicaId,
                especialidadeId,
                titulo,
                questoes: {
                    create: questoes.map((q) => ({
                        ordem: q.ordem,
                        pergunta: q.pergunta,
                        tipoResposta: q.tipoResposta,
                        options: q.options == null ? client_1.Prisma.JsonNull : q.options,
                    })),
                },
            },
        });
    },
    async update(clinicaId, templateId, questoes) {
        const template = await prisma_1.prisma.anamneseTemplate.findFirst({
            where: { id: templateId, clinicaId },
        });
        if (!template) {
            throw new AppError_1.AppError('Template nao encontrado ou fora da clinica', 404);
        }
        const ops = questoes.map((q) => {
            if (q.id) {
                const updateData = {};
                if (q.ordem !== undefined)
                    updateData.ordem = q.ordem;
                if (q.pergunta !== undefined)
                    updateData.pergunta = q.pergunta;
                if (q.tipoResposta !== undefined)
                    updateData.tipoResposta = q.tipoResposta;
                if (q.options !== undefined)
                    updateData.options = q.options;
                return prisma_1.prisma.anamneseTemplateQuestao.update({
                    where: { id: q.id },
                    data: updateData,
                });
            }
            return prisma_1.prisma.anamneseTemplateQuestao.create({
                data: {
                    templateId,
                    ordem: q.ordem ?? 0,
                    pergunta: q.pergunta ?? '',
                    tipoResposta: q.tipoResposta ?? 'text',
                    options: q.options == null ? client_1.Prisma.JsonNull : q.options,
                },
            });
        });
        await Promise.all(ops);
        const refreshed = await prisma_1.prisma.anamneseTemplate.findUnique({
            where: { id: templateId },
            include: { questoes: { orderBy: { ordem: 'asc' } } },
        });
        if (!refreshed) {
            throw new AppError_1.AppError('Template nao encontrado apos atualizacao', 404);
        }
        return refreshed;
    },
    async delete(clinicaId, templateId) {
        const template = await prisma_1.prisma.anamneseTemplate.findFirst({
            where: { id: templateId, clinicaId },
        });
        if (!template) {
            throw new AppError_1.AppError('Template nao encontrado', 404);
        }
        await prisma_1.prisma.anamneseTemplate.delete({ where: { id: templateId } });
        return true;
    },
};
function toTemplateKey(nomeEspecialidade) {
    const normalized = nomeEspecialidade
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
    if (normalized.includes('ODONTO'))
        return 'ODONTOLOGIA';
    if (normalized.includes('CARDIO'))
        return 'CARDIOLOGIA';
    if (normalized.includes('PEDIATR'))
        return 'PEDIATRIA';
    if (normalized.includes('GINECO'))
        return 'GINECOLOGIA';
    if (normalized.includes('GERAL') || normalized.includes('CLINICA'))
        return 'GERAL';
    return 'GERAL';
}
