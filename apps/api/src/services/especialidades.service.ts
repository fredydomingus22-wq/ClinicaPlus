import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import type { 
  EspecialidadeCreateInput, 
  EspecialidadeUpdateInput, 
  EspecialidadeDTO, 
  EspecialidadeListQuery, 
  PaginatedResult 
} from '@clinicaplus/types';

export const especialidadesService = {
  async list(clinicaId: string, query: EspecialidadeListQuery): Promise<PaginatedResult<EspecialidadeDTO>> {
    const { q, page = 1, limit = 20, ativo } = query;
    
    const where = {
      clinicaId,
      ...(ativo !== undefined && { ativo }),
      ...(q && {
        nome: { contains: q, mode: 'insensitive' as const }
      })
    };

    const [items, total] = await prisma.$transaction([
      prisma.especialidade.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nome: 'asc' }
      }),
      prisma.especialidade.count({ where })
    ]);

    return {
      items: items.map(toDTO),
      total,
      page,
      limit
    };
  },

  async getOne(id: string, clinicaId: string): Promise<EspecialidadeDTO> {
    const esp = await prisma.especialidade.findUnique({ where: { id } });
    if (!esp || esp.clinicaId !== clinicaId) {
      throw new AppError('Especialidade não encontrada', 404, 'NOT_FOUND');
    }
    return toDTO(esp);
  },

  async create(data: EspecialidadeCreateInput, clinicaId: string): Promise<EspecialidadeDTO> {
    const esp = await prisma.especialidade.create({
      data: {
        clinicaId,
        nome: data.nome,
        descricao: data.descricao ?? null, // Ensure descricao is null if undefined
        ativo: data.ativo ?? true, // Default to true if undefined
      }
    });
    return toDTO(esp);
  },

  async update(id: string, data: EspecialidadeUpdateInput, clinicaId: string): Promise<EspecialidadeDTO> {
    const existing = await prisma.especialidade.findUnique({ where: { id } });
    if (!existing || existing.clinicaId !== clinicaId) {
      throw new AppError('Especialidade não encontrada', 404, 'NOT_FOUND');
    }
    
    const updateData: Parameters<typeof prisma.especialidade.update>[0]['data'] = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.descricao !== undefined) updateData.descricao = data.descricao ?? null;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;

    const updated = await prisma.especialidade.update({ 
      where: { id }, 
      data: updateData 
    });
    return toDTO(updated);
  },

  async delete(id: string, clinicaId: string): Promise<void> {
    const existing = await prisma.especialidade.findUnique({ 
      where: { id },
      include: { _count: { select: { medicos: true } } }
    });
    
    if (!existing || existing.clinicaId !== clinicaId) {
      throw new AppError('Especialidade não encontrada', 404, 'NOT_FOUND');
    }

    if (existing._count.medicos > 0) {
      throw new AppError('Não é possível remover uma especialidade que possui médicos vinculados. Desative-a em vez disso.', 400, 'PROTECTED_RELATION');
    }

    await prisma.especialidade.delete({ where: { id } });
  }
};

import { Especialidade } from '@prisma/client';

function toDTO(esp: Especialidade): EspecialidadeDTO {
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
