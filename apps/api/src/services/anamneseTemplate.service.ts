// src/services/anamneseTemplate.service.ts
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import type { AnamneseTemplate, AnamneseTemplateQuestao } from '@prisma/client';
import type { Prisma } from '@prisma/client';
// Added interface for questao input to avoid any
interface QuestaoInput {
  id?: string;
  ordem?: number;
  pergunta?: string;
  tipoResposta?: string;
  options?: unknown;
}

export const anamneseTemplateService = {
  /** Get template for a given specialty within the current clinic */
  async getByEspecialidade(clinicaId: string, especialidadeId: string): Promise<AnamneseTemplate & { questoes: AnamneseTemplateQuestao[] }> {
    const template = await prisma.anamneseTemplate.findFirst({
      where: { clinicaId, especialidadeId },
      include: { questoes: { orderBy: { ordem: 'asc' } } },
    });
    if (!template) {
      throw new AppError('Template não encontrado', 404);
    }
    return template;
  },

  /** Create a new template for a specialty */
  async create(
    clinicaId: string,
    especialidadeId: string,
    titulo: string,
    questoes: Omit<AnamneseTemplateQuestao, 'id' | 'templateId' | 'criadoEm' | 'atualizadoEm'>[],
  ): Promise<AnamneseTemplate> {
    // Ensure specialty belongs to clinic
    const exists = await prisma.anamneseTemplate.findFirst({
      where: { clinicaId, especialidadeId },
    });
    if (exists) {
      throw new AppError('Template já existe para esta especialidade', 400);
    }
    return await prisma.anamneseTemplate.create({
      data: {
        clinicaId,
        especialidadeId,
        titulo,
        questoes: {
          create: questoes.map((q) => ({
            ordem: q.ordem,
            pergunta: q.pergunta,
            tipoResposta: q.tipoResposta,
            options: q.options as Prisma.InputJsonValue,
          })),
        },
      },
      include: { questoes: true },
    });
  },

  /** Update template questions */
  async update(
    clinicaId: string,
    templateId: string,
    questoes: QuestaoInput[],
  ): Promise<AnamneseTemplate> {
    // Verify ownership
    const template = await prisma.anamneseTemplate.findFirst({
      where: { id: templateId, clinicaId },
    });
    if (!template) {
      throw new AppError('Template não encontrado ou fora da clínica', 404);
    }
    // Upsert each question
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
          options: (q.options ?? null) as Prisma.InputJsonValue,
        },
      });
    });
    await Promise.all(ops);
    // Return refreshed template
    const refreshed = await prisma.anamneseTemplate.findUnique({
      where: { id: templateId },
      include: { questoes: { orderBy: { ordem: 'asc' } } },
    });
    if (!refreshed) {
      throw new AppError('Template não encontrado após atualização', 404);
    }
    return refreshed;
  },

  /** Delete a template */
  async delete(clinicaId: string, templateId: string): Promise<boolean> {
    const template = await prisma.anamneseTemplate.findFirst({
      where: { id: templateId, clinicaId },
    });
    if (!template) {
      throw new AppError('Template não encontrado', 404);
    }
    await prisma.anamneseTemplate.delete({ where: { id: templateId } });
    return true;
  },
};
