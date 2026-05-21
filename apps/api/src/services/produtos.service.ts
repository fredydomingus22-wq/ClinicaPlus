import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { TipoProduto } from '@clinicaplus/types';

export const produtosService = {
  /**
   * Lista todas as categorias de produtos/serviços de uma clínica
   */
  async listCategorias(clinicaId: string) {
    const categorias = await prisma.categoriaProduto.findMany({
      where: { clinicaId, ativo: true },
      orderBy: { nome: 'asc' },
    });
    return { data: categorias };
  },

  /**
   * Cria uma nova categoria
   */
  async createCategoria(clinicaId: string, data: { nome: string; descricao?: string; cor?: string }) {
    const categoria = await prisma.categoriaProduto.create({
      data: {
        ...data,
        clinicaId,
      },
    });
    return { data: categoria };
  },

  /**
   * Lista todos os produtos/serviços de uma clínica com filtros
   */
  async listProdutos(clinicaId: string, filters: { categoriaId?: string; tipo?: TipoProduto; busca?: string }) {
    const produtos = await prisma.produto.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(filters.categoriaId ? { categoriaId: filters.categoriaId } : {}),
        ...(filters.tipo ? { tipo: filters.tipo } : {}),
        ...(filters.busca ? {
          OR: [
            { nome: { contains: filters.busca, mode: 'insensitive' } },
            { codigo: { contains: filters.busca, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        categoria: true,
        _count: {
          select: { lotes: true }
        }
      },
      orderBy: { nome: 'asc' },
    });

    // Em uma versão futura, podemos adicionar o estoque total consolidado aqui
    return { data: produtos };
  },

  /**
   * Obtém detalhes de um produto
   */
  async getProduto(clinicaId: string, id: string) {
    const produto = await prisma.produto.findFirst({
      where: { id, clinicaId },
      include: {
        categoria: true,
        lotes: {
          where: { quantidade: { gt: 0 } },
          orderBy: { dataValidade: 'asc' },
        },
      },
    });

    if (!produto) {
      throw new AppError('Produto não encontrado', 404);
    }

    return { data: produto };
  },

  /**
   * Cria um novo produto/serviço
   */
  async createProduto(clinicaId: string, data: any) {
    // Validar se categoria pertence à clínica
    const categoria = await prisma.categoriaProduto.findFirst({
      where: { id: data.categoriaId, clinicaId },
    });

    if (!categoria) {
      throw new AppError('Categoria inválida para esta clínica', 400);
    }

    const produto = await prisma.produto.create({
      data: {
        ...data,
        clinicaId,
      },
    });

    return { data: produto };
  },

  /**
   * Atualiza um produto/serviço
   */
  async updateProduto(clinicaId: string, id: string, data: any) {
    const produto = await prisma.produto.findFirst({
      where: { id, clinicaId },
    });

    if (!produto) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Se estiver mudando de categoria, validar
    if (data.categoriaId && data.categoriaId !== produto.categoriaId) {
      const categoria = await prisma.categoriaProduto.findFirst({
        where: { id: data.categoriaId, clinicaId },
      });

      if (!categoria) {
        throw new AppError('Categoria inválida para esta clínica', 400);
      }
    }

    const updated = await prisma.produto.update({
      where: { id },
      data,
    });

    return { data: updated };
  }
};
