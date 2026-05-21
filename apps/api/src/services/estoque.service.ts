import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { TipoMovimentacao } from '@clinicaplus/types';

export const estoqueService = {
  /**
   * Registra uma movimentação de estoque
   */
  async movimentar(clinicaId: string, data: {
    produtoId: string;
    loteId?: string;
    quantidade: number;
    tipo: TipoMovimentacao;
    motivo?: string;
    documentoRef?: string;
    utilizadorId?: string;
  }) {
    const { produtoId, quantidade, tipo, loteId } = data;

    // 1. Validar produto
    const produto = await prisma.produto.findFirst({
      where: { id: produtoId, clinicaId },
    });

    if (!produto) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (!produto.gerenciaEstoque) {
      throw new AppError('Este produto não possui controle de estoque ativo', 400);
    }

    // 2. Se for saída, validar saldo
    const eSaida = [TipoMovimentacao.SAIDA, TipoMovimentacao.VENDA].includes(tipo);
    const fator = eSaida ? -1 : 1;

    return await prisma.$transaction(async (tx) => {
      let loteFinalId = loteId;

      // Se for saída e não especificou lote, tentar FIFO (mais antigo primeiro)
      if (eSaida && !loteFinalId) {
        const loteDisponivel = await tx.estoqueLote.findFirst({
          where: { 
            produtoId, 
            clinicaId, 
            quantidade: { gte: quantidade } 
          },
          orderBy: { dataValidade: 'asc' },
        });

        if (!loteDisponivel) {
          throw new AppError('Não há estoque suficiente disponível em lotes válidos', 400);
        }
        loteFinalId = loteDisponivel.id;
      }

      // Se tiver lote (especificado ou encontrado), atualizar saldo do lote
      if (loteFinalId) {
        const lote = await tx.estoqueLote.findFirst({
          where: { id: loteFinalId, clinicaId },
        });

        if (!lote) throw new AppError('Lote não encontrado', 404);
        
        if (eSaida && lote.quantidade < quantidade) {
          throw new AppError(`Estoque insuficiente no lote ${lote.numeroLote}. Disponível: ${lote.quantidade}`, 400);
        }

        await tx.estoqueLote.update({
          where: { id: loteFinalId },
          data: { quantidade: { increment: quantidade * fator } },
        });
      }

      // 3. Registrar movimentação
      const movimento = await tx.movimentacaoEstoque.create({
        data: {
          clinicaId,
          produtoId,
          loteId: loteFinalId || null,
          quantidade,
          tipo,
          motivo: data.motivo || null,
          documentoRef: data.documentoRef || null,
          utilizadorId: data.utilizadorId || null,
        },
      });

      return movimento;
    });
  },

  /**
   * Lista lotes de um produto
   */
  async listLotes(clinicaId: string, produtoId: string) {
    const lotes = await prisma.estoqueLote.findMany({
      where: { clinicaId, produtoId },
      orderBy: [
        { dataValidade: 'asc' },
        { criadoEm: 'desc' },
      ],
    });
    return { data: lotes };
  },

  /**
   * Obtém o estoque total de um produto (soma de todos os lotes)
   */
  async getEstoqueTotal(clinicaId: string, produtoId: string): Promise<number> {
    const result = await prisma.estoqueLote.aggregate({
      where: { clinicaId, produtoId },
      _sum: { quantidade: true },
    });
    return result._sum.quantidade || 0;
  },

  /**
   * Cria ou atualiza um lote manualmente (entrada de mercadoria manual)
   */
  async createLote(clinicaId: string, data: {
    produtoId: string;
    numeroLote: string;
    dataValidade?: Date | string;
    quantidade: number;
    utilizadorId?: string;
  }) {
    // Validar produto
    const produto = await prisma.produto.findFirst({
      where: { id: data.produtoId, clinicaId },
    });

    if (!produto) throw new AppError('Produto não encontrado', 404);

    return await prisma.$transaction(async (tx) => {
      // Tentar encontrar lote existente com mesmo número
      let lote = await tx.estoqueLote.findFirst({
        where: { clinicaId, produtoId: data.produtoId, numeroLote: data.numeroLote },
      });

      if (lote) {
        lote = await tx.estoqueLote.update({
          where: { id: lote.id },
          data: { 
            quantidade: { increment: data.quantidade },
            ...(data.dataValidade ? { dataValidade: new Date(data.dataValidade) } : {}),
          },
        });
      } else {
        lote = await tx.estoqueLote.create({
          data: {
            clinicaId,
            produtoId: data.produtoId,
            numeroLote: data.numeroLote,
            dataValidade: data.dataValidade ? new Date(data.dataValidade) : null,
            quantidade: data.quantidade,
          },
        });
      }

      // Registrar movimento de entrada
      await tx.movimentacaoEstoque.create({
        data: {
          clinicaId,
          produtoId: data.produtoId,
          loteId: lote.id,
          quantidade: data.quantidade,
          tipo: TipoMovimentacao.ENTRADA,
          motivo: 'Entrada manual / Cadastro de lote',
          utilizadorId: data.utilizadorId || null,
        },
      });

      return lote;
    });
  }
};
