import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { Prisma } from '@prisma/client';
import type { AnamneseTemplate, AnamneseTemplateQuestao } from '@prisma/client';
import { ANAMNESE_TEMPLATES, type Especialidade as EspecialidadeTemplate } from '@clinicaplus/types';

interface QuestaoInput {
  id?: string | undefined;
  ordem?: number | undefined;
  pergunta?: string | undefined;
  tipoResposta?: string | undefined;
  options?: unknown | undefined;
}

interface CreateQuestaoInput {
  ordem: number;
  pergunta: string;
  tipoResposta: string;
  options?: Prisma.InputJsonValue | null | undefined;
}

export const anamneseTemplateService = {
  async getByEspecialidade(
    clinicaId: string,
    especialidadeId: string,
  ): Promise<AnamneseTemplate & { questoes: AnamneseTemplateQuestao[] }> {
    const existing = await prisma.anamneseTemplate.findFirst({
      where: { clinicaId, especialidadeId },
      include: { questoes: { orderBy: { ordem: 'asc' } } },
    });

    if (existing) return existing;

    const especialidade = await prisma.especialidade.findFirst({
      where: { id: especialidadeId, clinicaId },
    });

    if (!especialidade) {
      throw new AppError('Especialidade nao encontrada para esta clinica', 404);
    }

    const templateKey = toTemplateKey(especialidade.nome);
    const questoesBase = ANAMNESE_TEMPLATES[templateKey];

    if (!questoesBase || questoesBase.length === 0) {
      throw new AppError('Template nao encontrado para esta especialidade', 404);
    }

    const created = await prisma.anamneseTemplate.create({
      data: {
        clinicaId,
        especialidadeId,
        titulo: `Template de ${especialidade.nome}`,
        questoes: {
          create: questoesBase.map((q, index) => ({
            ordem: index + 1,
            pergunta: q.label,
            tipoResposta: q.tipo,
            options: q.opcoes ? (q.opcoes as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        },
      },
      include: { questoes: { orderBy: { ordem: 'asc' } } },
    });

    return created;
  },

  async create(
    clinicaId: string,
    especialidadeId: string,
    titulo: string,
    questoes: CreateQuestaoInput[],
  ): Promise<AnamneseTemplate> {
    const exists = await prisma.anamneseTemplate.findFirst({
      where: { clinicaId, especialidadeId },
    });
    if (exists) {
      throw new AppError('Template ja existe para esta especialidade', 400);
    }

    return prisma.anamneseTemplate.create({
      data: {
        clinicaId,
        especialidadeId,
        titulo,
        questoes: {
          create: questoes.map((q) => ({
            ordem: q.ordem,
            pergunta: q.pergunta,
            tipoResposta: q.tipoResposta,
            options: q.options == null ? Prisma.JsonNull : (q.options as Prisma.InputJsonValue),
          })),
        },
      },
    });
  },

  async update(
    clinicaId: string,
    templateId: string,
    questoes: QuestaoInput[],
  ): Promise<AnamneseTemplate> {
    const template = await prisma.anamneseTemplate.findFirst({
      where: { id: templateId, clinicaId },
    });
    if (!template) {
      throw new AppError('Template nao encontrado ou fora da clinica', 404);
    }

    const ops = questoes.map((q) => {
      if (q.id) {
        const updateData: {
          ordem?: number;
          pergunta?: string;
          tipoResposta?: string;
          options?: Prisma.InputJsonValue;
        } = {};

        if (q.ordem !== undefined) updateData.ordem = q.ordem;
        if (q.pergunta !== undefined) updateData.pergunta = q.pergunta;
        if (q.tipoResposta !== undefined) updateData.tipoResposta = q.tipoResposta;
        if (q.options !== undefined) updateData.options = q.options as Prisma.InputJsonValue;

        return prisma.anamneseTemplateQuestao.update({
          where: { id: q.id },
          data: updateData,
        });
      }

      return prisma.anamneseTemplateQuestao.create({
        data: {
          templateId,
          ordem: q.ordem ?? 0,
          pergunta: q.pergunta ?? '',
          tipoResposta: q.tipoResposta ?? 'text',
          options: q.options == null ? Prisma.JsonNull : (q.options as Prisma.InputJsonValue),
        },
      });
    });

    await Promise.all(ops);

    const refreshed = await prisma.anamneseTemplate.findUnique({
      where: { id: templateId },
      include: { questoes: { orderBy: { ordem: 'asc' } } },
    });

    if (!refreshed) {
      throw new AppError('Template nao encontrado apos atualizacao', 404);
    }

    return refreshed;
  },

  async delete(clinicaId: string, templateId: string): Promise<boolean> {
    const template = await prisma.anamneseTemplate.findFirst({
      where: { id: templateId, clinicaId },
    });
    if (!template) {
      throw new AppError('Template nao encontrado', 404);
    }

    await prisma.anamneseTemplate.delete({ where: { id: templateId } });
    return true;
  },
};

function toTemplateKey(nomeEspecialidade: string): EspecialidadeTemplate {
  const normalized = nomeEspecialidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (normalized.includes('ODONTO')) return 'ODONTOLOGIA';
  if (normalized.includes('CARDIO')) return 'CARDIOLOGIA';
  if (normalized.includes('PEDIATR')) return 'PEDIATRIA';
  if (normalized.includes('GINECO')) return 'GINECOLOGIA';
  if (normalized.includes('GERAL') || normalized.includes('CLINICA')) return 'GERAL';

  return 'GERAL';
}
