import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { estoqueCalculoService } from './estoque.calculo.service';
import { InventoryMapper } from '../dto/inventory.dto';
import {
  CreateLoteSchema,
  MovimentarEstoqueSchema,
} from '../schemas/inventory.schema';

/**
 * Helper para invalidar cache de estoque após movimentações
 */
async function invalidateEstoqueCache(clinicaId: string, produtoId: string): Promise<void> {
  try {
    const pattern = `estoque:*:${clinicaId}:${produtoId}*`;
    const { redis } = await import('../lib/redis');
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Silenciosamente falhar se o cache não estiver disponível
  }
}

export const estoqueService = {
  /**
   * Registra uma movimentação de estoque
   */
  async movimentar(clinicaId: string, data: unknown) {
    const validated = MovimentarEstoqueSchema.parse(data);
    const { produtoId, quantidade, tipo, loteId } = validated;

    // 1. Validar produto
    const produto = await prisma.produto.findFirst({
      where: { id: produtoId, clinicaId },
      select: { id: true, gerenciaEstoque: true },
    });

    if (!produto) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (!produto.gerenciaEstoque) {
      throw new AppError('Este produto não possui controle de estoque ativo', 400);
    }

    // 2. Se for saída, validar saldo
    const eSaida = ['SAIDA', 'VENDA'].includes(tipo);
    const fator = eSaida ? -1 : 1;

    return await prisma.$transaction(async (tx) => {
      let loteFinalId: string | undefined = loteId || undefined;

      // Se for saída e não especificou lote, tentar FIFO usando service centralizado
      if (eSaida && !loteFinalId) {
        loteFinalId = await estoqueCalculoService.encontrarLoteFIFO(clinicaId, produtoId, quantidade) || undefined;

        if (!loteFinalId) {
          throw new AppError('Não há estoque suficiente disponível em lotes válidos', 400);
        }
      }

      // Se tiver lote (especificado ou encontrado), atualizar saldo do lote
      if (loteFinalId) {
        const saldoSuficiente = await estoqueCalculoService.verificarSaldoLote(clinicaId, loteFinalId, quantidade);

        if (!saldoSuficiente) {
          const lote = await tx.estoqueLote.findFirst({
            where: { id: loteFinalId, clinicaId },
            select: { numeroLote: true, quantidade: true },
          });

          if (lote) {
            throw new AppError(`Estoque insuficiente no lote ${lote.numeroLote}. Disponível: ${lote.quantidade}`, 400);
          }
          throw new AppError('Lote não encontrado', 404);
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
          motivo: validated.motivo || null,
          documentoRef: validated.documentoRef || null,
          utilizadorId: (validated as any).utilizadorId || null,
        },
        select: {
          id: true,
          clinicaId: true,
          produtoId: true,
          loteId: true,
          utilizadorId: true,
          tipo: true,
          quantidade: true,
          motivo: true,
          documentoRef: true,
          criadoEm: true,
          lote: {
            select: {
              id: true,
              clinicaId: true,
              produtoId: true,
              numeroLote: true,
              dataValidade: true,
              quantidade: true,
              criadoEm: true,
              atualizadoEm: true,
            },
          },
          produto: {
            select: {
              id: true,
              nome: true,
              codigo: true,
            },
          },
        },
      });

      // Invalidar cache do produto após movimentação
      await invalidateEstoqueCache(clinicaId, produtoId);

      return InventoryMapper.toMovimentacaoResponse(movimento);
    });
  },

  /**
   * Lista lotes de um produto
   */
  async listLotes(clinicaId: string, produtoId: string) {
    const lotes = await prisma.estoqueLote.findMany({
      where: { clinicaId, produtoId },
      select: {
        id: true,
        clinicaId: true,
        produtoId: true,
        numeroLote: true,
        dataValidade: true,
        quantidade: true,
        criadoEm: true,
        atualizadoEm: true,
        produto: {
          select: {
            id: true,
            nome: true,
            codigo: true,
          },
        },
      },
      orderBy: [
        { dataValidade: 'asc' },
        { criadoEm: 'desc' },
      ],
    });

    return { data: lotes.map(l => InventoryMapper.toLoteComProdutoResponse(l)) };
  },

  /**
   * Obtém o estoque total de um produto (soma de todos os lotes)
   * DEPRECATED: Use estoqueCalculoService.calcularEstoqueProduto
   */
  async getEstoqueTotal(clinicaId: string, produtoId: string): Promise<number> {
    return estoqueCalculoService.calcularEstoqueProduto(clinicaId, produtoId);
  },

  /**
   * Cria ou atualiza um lote manualmente (entrada de mercadoria manual)
   */
  async createLote(clinicaId: string, data: unknown) {
    const validated = CreateLoteSchema.parse(data);

    // Validar produto
    const produto = await prisma.produto.findFirst({
      where: { id: validated.produtoId, clinicaId },
      select: { id: true },
    });

    if (!produto) throw new AppError('Produto não encontrado', 404);

    return await prisma.$transaction(async (tx) => {
      // Tentar encontrar lote existente com mesmo número
      let lote = await tx.estoqueLote.findFirst({
        where: { clinicaId, produtoId: validated.produtoId, numeroLote: validated.numeroLote },
        select: { id: true },
      });

      if (lote) {
        lote = await tx.estoqueLote.update({
          where: { id: lote.id },
          data: {
            quantidade: { increment: validated.quantidade },
            ...(validated.dataValidade ? { dataValidade: validated.dataValidade } : {}),
          },
          select: {
            id: true,
            clinicaId: true,
            produtoId: true,
            numeroLote: true,
            dataValidade: true,
            quantidade: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        });
      } else {
        lote = await tx.estoqueLote.create({
          data: {
            clinicaId,
            produtoId: validated.produtoId,
            numeroLote: validated.numeroLote,
            dataValidade: validated.dataValidade || null,
            quantidade: validated.quantidade,
          },
          select: {
            id: true,
            clinicaId: true,
            produtoId: true,
            numeroLote: true,
            dataValidade: true,
            quantidade: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        });
      }

      // Registrar movimento de entrada
      await tx.movimentacaoEstoque.create({
        data: {
          clinicaId,
          produtoId: validated.produtoId,
          loteId: lote.id,
          quantidade: validated.quantidade,
          tipo: 'ENTRADA',
          motivo: 'Entrada manual / Cadastro de lote',
          utilizadorId: (validated as any).utilizadorId || null,
        },
      });

      // Invalidar cache do produto após criação de lote
      await invalidateEstoqueCache(clinicaId, validated.produtoId);

      return InventoryMapper.toLoteResponse(lote);
    });
  }
};
