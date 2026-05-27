import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { estoqueCalculoService } from './estoque.calculo.service';
import { InventoryMapper } from '../dto/inventory.dto';
import {
  CreateCategoriaSchema,
  CreateProdutoSchema,
  UpdateProdutoSchema,
  ListProdutosSchema,
} from '../schemas/inventory.schema';

export const produtosService = {
  /**
   * Lista todas as categorias de produtos/serviços de uma clínica
   */
  async listCategorias(clinicaId: string) {
    const categorias = await prisma.categoriaProduto.findMany({
      where: { clinicaId, ativo: true },
      select: {
        id: true,
        clinicaId: true,
        nome: true,
        descricao: true,
        cor: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
      orderBy: { nome: 'asc' },
    });

    const categoriasComContagem = await Promise.all(
      categorias.map(async (categoria) => {
        const totalProdutos = await prisma.produto.count({
          where: { categoriaId: categoria.id, clinicaId, ativo: true },
        });
        return {
          ...InventoryMapper.toCategoriaResponse(categoria),
          totalProdutos,
        };
      })
    );

    return { data: categoriasComContagem };
  },

  /**
   * Cria uma nova categoria
   */
  async createCategoria(clinicaId: string, data: unknown) {
    const validated = CreateCategoriaSchema.parse(data);
    const categoria = await prisma.categoriaProduto.create({
      data: {
        nome: validated.nome,
        descricao: validated.descricao ?? null,
        cor: validated.cor ?? null,
        clinicaId,
      },
      select: {
        id: true,
        clinicaId: true,
        nome: true,
        descricao: true,
        cor: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
    return { data: InventoryMapper.toCategoriaResponse(categoria) };
  },

  /**
   * Lista todos os produtos/serviços de uma clínica com filtros
   */
  async listProdutos(clinicaId: string, filters: unknown) {
    const validated = ListProdutosSchema.parse(filters);

    const produtos = await prisma.produto.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(validated.categoriaId ? { categoriaId: validated.categoriaId } : {}),
        ...(validated.tipo ? { tipo: validated.tipo } : {}),
        ...(validated.busca ? {
          OR: [
            { nome: { contains: validated.busca, mode: 'insensitive' } },
            { codigo: { contains: validated.busca, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        clinicaId: true,
        categoriaId: true,
        codigo: true,
        nome: true,
        descricao: true,
        precoCusto: true,
        precoVenda: true,
        taxaIva: true,
        tipo: true,
        gerenciaEstoque: true,
        estoqueMinimo: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        categoria: {
          select: {
            id: true,
            clinicaId: true,
            nome: true,
            descricao: true,
            cor: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    // Calcular estoque atual em batch para evitar N+1 queries
    const produtoIds = produtos.map(p => p.id);
    const estoqueBatch = await estoqueCalculoService.calcularEstoqueBatch(clinicaId, produtoIds);

    const produtosComEstoque = produtos.map(produto =>
      InventoryMapper.toProdutoListResponse(produto, estoqueBatch[produto.id] || 0)
    );

    return { data: produtosComEstoque };
  },

  /**
   * Obtém detalhes de um produto
   */
  async getProduto(clinicaId: string, id: string) {
    const produto = await prisma.produto.findFirst({
      where: { id, clinicaId },
      select: {
        id: true,
        clinicaId: true,
        categoriaId: true,
        codigo: true,
        nome: true,
        descricao: true,
        precoCusto: true,
        precoVenda: true,
        taxaIva: true,
        codigoIva: true,
        motivoIsencao: true,
        tipo: true,
        gerenciaEstoque: true,
        estoqueMinimo: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        categoria: {
          select: {
            id: true,
            clinicaId: true,
            nome: true,
            descricao: true,
            cor: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        },
        lotes: {
          where: { quantidade: { gt: 0 } },
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
          orderBy: { dataValidade: 'asc' },
        },
      },
    });

    if (!produto) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Calcular estoque atual usando service centralizado
    const estoqueAtual = await estoqueCalculoService.calcularEstoqueProduto(clinicaId, id);

    return { data: InventoryMapper.toProdutoResponse(produto, estoqueAtual) };
  },

  /**
   * Cria um novo produto/serviço
   */
  async createProduto(clinicaId: string, data: unknown) {
    const validated = CreateProdutoSchema.parse(data);

    // Validar se categoria pertence à clínica
    const categoria = await prisma.categoriaProduto.findFirst({
      where: { id: validated.categoriaId, clinicaId },
      select: { id: true },
    });

    if (!categoria) {
      throw new AppError('Categoria inválida para esta clínica', 400);
    }

    const produto = await prisma.produto.create({
      data: {
        nome: validated.nome,
        tipo: validated.tipo,
        categoriaId: validated.categoriaId,
        codigo: validated.codigo ?? null,
        descricao: validated.descricao ?? null,
        precoCusto: validated.precoCusto,
        precoVenda: validated.precoVenda,
        taxaIva: validated.taxaIva,
        codigoIva: validated.codigoIva,
        motivoIsencao: validated.motivoIsencao ?? null,
        gerenciaEstoque: validated.gerenciaEstoque,
        estoqueMinimo: validated.estoqueMinimo,
        clinicaId,
      },
      select: {
        id: true,
        clinicaId: true,
        categoriaId: true,
        codigo: true,
        nome: true,
        descricao: true,
        precoCusto: true,
        precoVenda: true,
        taxaIva: true,
        codigoIva: true,
        motivoIsencao: true,
        tipo: true,
        gerenciaEstoque: true,
        estoqueMinimo: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        categoria: {
          select: {
            id: true,
            clinicaId: true,
            nome: true,
            descricao: true,
            cor: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        },
      },
    });

    return { data: InventoryMapper.toProdutoResponse(produto, 0) };
  },

  /**
   * Atualiza um produto/serviço
   */
  async updateProduto(clinicaId: string, id: string, data: unknown) {
    const validated = UpdateProdutoSchema.parse(data);

    const produto = await prisma.produto.findFirst({
      where: { id, clinicaId },
      select: { id: true, categoriaId: true },
    });

    if (!produto) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Se estiver mudando de categoria, validar
    if (validated.categoriaId && validated.categoriaId !== produto.categoriaId) {
      const categoria = await prisma.categoriaProduto.findFirst({
        where: { id: validated.categoriaId, clinicaId },
        select: { id: true },
      });

      if (!categoria) {
        throw new AppError('Categoria inválida para esta clínica', 400);
      }
    }

    const updateData: any = {};
    if (validated.nome !== undefined) updateData.nome = validated.nome;
    if (validated.tipo !== undefined) updateData.tipo = validated.tipo;
    if (validated.categoriaId !== undefined) updateData.categoriaId = validated.categoriaId;
    if (validated.codigo !== undefined) updateData.codigo = validated.codigo ?? null;
    if (validated.descricao !== undefined) updateData.descricao = validated.descricao ?? null;
    if (validated.precoCusto !== undefined) updateData.precoCusto = validated.precoCusto;
    if (validated.precoVenda !== undefined) updateData.precoVenda = validated.precoVenda;
    if (validated.taxaIva !== undefined) updateData.taxaIva = validated.taxaIva;
    if (validated.codigoIva !== undefined) updateData.codigoIva = validated.codigoIva;
    if (validated.motivoIsencao !== undefined) updateData.motivoIsencao = validated.motivoIsencao ?? null;
    if (validated.gerenciaEstoque !== undefined) updateData.gerenciaEstoque = validated.gerenciaEstoque;
    if (validated.estoqueMinimo !== undefined) updateData.estoqueMinimo = validated.estoqueMinimo;

    const updated = await prisma.produto.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        clinicaId: true,
        categoriaId: true,
        codigo: true,
        nome: true,
        descricao: true,
        precoCusto: true,
        precoVenda: true,
        taxaIva: true,
        codigoIva: true,
        motivoIsencao: true,
        tipo: true,
        gerenciaEstoque: true,
        estoqueMinimo: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        categoria: {
          select: {
            id: true,
            clinicaId: true,
            nome: true,
            descricao: true,
            cor: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        },
      },
    });

    const estoqueAtual = await estoqueCalculoService.calcularEstoqueProduto(clinicaId, id);
    return { data: InventoryMapper.toProdutoResponse(updated, estoqueAtual) };
  }
};
