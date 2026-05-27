/**
 * DTOs (Data Transfer Objects) para respostas normalizadas do módulo de inventário/stock
 * Mantém consistência com a arquitetura atual do projeto (Express + Prisma + TypeScript)
 */

// Categoria
export interface CategoriaResponse {
  id: string;
  clinicaId: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CategoriaComContagemResponse extends CategoriaResponse {
  totalProdutos: number;
}

// Produto
export interface ProdutoResponse {
  id: string;
  clinicaId: string;
  categoriaId: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  precoCusto: number;
  precoVenda: number;
  taxaIva: number;
  codigoIva: string;
  motivoIsencao: string | null;
  tipo: 'PRODUTO' | 'SERVICO';
  gerenciaEstoque: boolean;
  estoqueMinimo: number;
  estoqueAtual: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  categoria: CategoriaResponse;
  lotes: LoteResponse[];
}

export interface ProdutoListResponse {
  id: string;
  clinicaId: string;
  categoriaId: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  precoCusto: number;
  precoVenda: number;
  taxaIva: number;
  tipo: 'PRODUTO' | 'SERVICO';
  gerenciaEstoque: boolean;
  estoqueMinimo: number;
  estoqueAtual: number;
  ativo: boolean;
  categoria: CategoriaResponse;
}

// Lote
export interface LoteResponse {
  id: string;
  clinicaId: string;
  produtoId: string;
  numeroLote: string;
  dataValidade: string | null;
  quantidade: number;
  diasAteValidade: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface LoteComProdutoResponse extends LoteResponse {
  produto: {
    id: string;
    nome: string;
    codigo: string | null;
  };
}

// Movimentação
export interface MovimentacaoResponse {
  id: string;
  clinicaId: string;
  produtoId: string;
  loteId: string | null;
  utilizadorId: string | null;
  tipo: 'ENTRADA' | 'SAIDA' | 'VENDA' | 'AJUSTE' | 'TRANSFERENCIA';
  quantidade: number;
  motivo: string | null;
  documentoRef: string | null;
  criadoEm: string;
  lote: LoteResponse | null;
  produto: {
    id: string;
    nome: string;
    codigo: string | null;
  };
}

// Paginação
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Analytics
export interface KpiEstoqueResponse {
  totalProdutos: number;
  totalServicos: number;
  valorTotalEstoque: number;
  itensAbaixoMinimo: number;
  itensComValidade30d: number;
  itensComValidade60d: number;
  taxaRotatividade: number;
  diasEstoque: number;
  taxaRuptura: number;
}

export interface TopMovimentadoItem {
  produtoId: string;
  nome: string;
  codigo: string | null;
  categoria: string;
  tipo: string;
  totalSaidas: number;
  totalEntradas: number;
  totalMovimentacoes: number;
  receita: number;
  classificacaoAbc: 'A' | 'B' | 'C';
}

export interface TendenciaEstoqueItem {
  data: string;
  entradas: number;
  saidas: number;
  saldoAcumulado: number;
}

export interface PrevisaoRupturaItem {
  produtoId: string;
  nome: string;
  estoqueAtual: number;
  consumoMedioDiario: number;
  diasAteRuptura: number | null;
  dataEstimadaRuptura: string | null;
  criticidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK';
}

export interface DistribuicaoCategoria {
  categoriaId: string;
  nome: string;
  cor: string | null;
  totalItens: number;
  valorEstoque: number;
  movimentacoes: number;
}

// Mappers para converter Prisma para DTO
export class InventoryMapper {
  static toCategoriaResponse(data: any): CategoriaResponse {
    return {
      id: data.id,
      clinicaId: data.clinicaId,
      nome: data.nome,
      descricao: data.descricao,
      cor: data.cor,
      ativo: data.ativo,
      criadoEm: data.criadoEm.toISOString(),
      atualizadoEm: data.atualizadoEm.toISOString(),
    };
  }

  static toProdutoResponse(data: any, estoqueAtual: number = 0): ProdutoResponse {
    return {
      id: data.id,
      clinicaId: data.clinicaId,
      categoriaId: data.categoriaId,
      codigo: data.codigo,
      nome: data.nome,
      descricao: data.descricao,
      precoCusto: data.precoCusto,
      precoVenda: data.precoVenda,
      taxaIva: data.taxaIva,
      codigoIva: data.codigoIva,
      motivoIsencao: data.motivoIsencao,
      tipo: data.tipo,
      gerenciaEstoque: data.gerenciaEstoque,
      estoqueMinimo: data.estoqueMinimo,
      estoqueAtual,
      ativo: data.ativo,
      criadoEm: data.criadoEm.toISOString(),
      atualizadoEm: data.atualizadoEm.toISOString(),
      categoria: this.toCategoriaResponse(data.categoria),
      lotes: data.lotes?.map((l: any) => this.toLoteResponse(l)) || [],
    };
  }

  static toProdutoListResponse(data: any, estoqueAtual: number = 0): ProdutoListResponse {
    return {
      id: data.id,
      clinicaId: data.clinicaId,
      categoriaId: data.categoriaId,
      codigo: data.codigo,
      nome: data.nome,
      descricao: data.descricao,
      precoCusto: data.precoCusto,
      precoVenda: data.precoVenda,
      taxaIva: data.taxaIva,
      tipo: data.tipo,
      gerenciaEstoque: data.gerenciaEstoque,
      estoqueMinimo: data.estoqueMinimo,
      estoqueAtual,
      ativo: data.ativo,
      categoria: this.toCategoriaResponse(data.categoria),
    };
  }

  static toLoteResponse(data: any): LoteResponse {
    const diasAteValidade = data.dataValidade
      ? Math.floor((data.dataValidade.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: data.id,
      clinicaId: data.clinicaId,
      produtoId: data.produtoId,
      numeroLote: data.numeroLote,
      dataValidade: data.dataValidade?.toISOString() || null,
      quantidade: data.quantidade,
      diasAteValidade,
      criadoEm: data.criadoEm.toISOString(),
      atualizadoEm: data.atualizadoEm.toISOString(),
    };
  }

  static toLoteComProdutoResponse(data: any): LoteComProdutoResponse {
    return {
      ...this.toLoteResponse(data),
      produto: {
        id: data.produto.id,
        nome: data.produto.nome,
        codigo: data.produto.codigo,
      },
    };
  }

  static toMovimentacaoResponse(data: any): MovimentacaoResponse {
    return {
      id: data.id,
      clinicaId: data.clinicaId,
      produtoId: data.produtoId,
      loteId: data.loteId,
      utilizadorId: data.utilizadorId,
      tipo: data.tipo,
      quantidade: data.quantidade,
      motivo: data.motivo,
      documentoRef: data.documentoRef,
      criadoEm: data.criadoEm.toISOString(),
      lote: data.lote ? this.toLoteResponse(data.lote) : null,
      produto: {
        id: data.produto.id,
        nome: data.produto.nome,
        codigo: data.produto.codigo,
      },
    };
  }
}
