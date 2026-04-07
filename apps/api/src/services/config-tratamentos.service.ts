import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { CriarTipoExameClinicaDto, CriarTipoTratamentoDto } from '@clinicaplus/types';

export const tratamentosConfigService = {
  // --- TIPOS DE EXAMES ---
  async listTiposExame(clinicaId: string): Promise<unknown[]> {
    return prisma.tipoExameClinica.findMany({
      where: { clinicaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async createTipoExame(clinicaId: string, data: CriarTipoExameClinicaDto): Promise<unknown> {
    try {
      const { nome, descricao, ativo } = data;
      return await prisma.tipoExameClinica.create({
        data: {
          clinicaId,
          nome,
          descricao: descricao ?? null,
          preco: data.preco ?? 0,
          ativo: ativo ?? true,
        },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new AppError('Já existe um tipo de exame com este nome nesta clínica', 400);
      }
      throw error;
    }
  },

  // --- TIPOS DE TRATAMENTO ---
  async listTiposTratamento(clinicaId: string): Promise<unknown[]> {
    return prisma.tipoTratamento.findMany({
      where: { clinicaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async createTipoTratamento(clinicaId: string, data: CriarTipoTratamentoDto): Promise<unknown> {
    try {
      const { nome, descricao, duracaoMin, ativo } = data;
      return await prisma.tipoTratamento.create({
        data: {
          clinicaId,
          nome,
          descricao: descricao ?? null,
          duracaoMin: duracaoMin ?? null,
          preco: data.preco ?? 0,
          ativo: ativo ?? true,
        },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new AppError('Já existe um tipo de tratamento com este nome nesta clínica', 400);
      }
      throw error;
    }
  },
};
