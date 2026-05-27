/**
 * Tipos TypeScript para o módulo de inventário/stock no frontend
 * Baseados nos Zod schemas (apps/web/src/schemas/inventory.schema.ts)
 * Mantém consistência com a arquitetura atual do projeto
 */

// Input types are exported from schemas/inventory.schema.ts
// Use: import { type CreateCategoriaInput } from '../schemas/inventory.schema'

export interface CategoriaResponse {
  id: string;
  clinicaId: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  totalProdutos?: number;
}

// Input types are exported from schemas/inventory.schema.ts
// Use: import { type CreateProdutoInput, type UpdateProdutoInput } from '../schemas/inventory.schema'

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
  codigoIva: string;
  motivoIsencao: string | null;
  tipo: 'PRODUTO' | 'SERVICO';
  gerenciaEstoque: boolean;
  estoqueMinimo: number;
  estoqueAtual: number;
  ativo: boolean;
  categoria: CategoriaResponse;
}

// Input types are exported from schemas/inventory.schema.ts
// Use: import { type CreateLoteInput } from '../schemas/inventory.schema'

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

// Input types are exported from schemas/inventory.schema.ts
// Use: import { type MovimentarEstoqueInput } from '../schemas/inventory.schema'

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

// Filtros
export interface ListProdutosInput {
  categoriaId?: string;
  tipo?: 'PRODUTO' | 'SERVICO';
  busca?: string;
  page?: number;
  limit?: number;
}

export interface AnalyticsFiltersInput {
  dataInicio?: string;
  dataFim?: string;
  categoriaId?: string;
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
