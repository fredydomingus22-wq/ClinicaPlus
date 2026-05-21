import { z } from 'zod';
import { TipoProduto, TipoMovimentacao } from '../enums';

export const CategoriaProdutoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, 'Nome da categoria deve ter pelo menos 2 caracteres'),
  descricao: z.string().optional(),
  cor: z.string().optional(),
  ativo: z.boolean().default(true),
});

export type CategoriaProdutoDTO = z.infer<typeof CategoriaProdutoSchema> & { id: string; clinicaId: string };

export const ProdutoSchema = z.object({
  id: z.string().optional(),
  categoriaId: z.string().min(1, 'Categoria é obrigatória'),
  codigo: z.string().optional(), // SKU/Referência
  nome: z.string().min(2, 'Nome do produto deve ter pelo menos 2 caracteres'),
  descricao: z.string().optional(),
  precoCusto: z.number().int().min(0).default(0),
  precoVenda: z.number().int().min(0),
  taxaIva: z.number().min(0).max(14).default(14),
  codigoIva: z.string().default('IVA'),
  motivoIsencao: z.string().optional(),
  tipo: z.nativeEnum(TipoProduto).default(TipoProduto.PRODUTO),
  gerenciaEstoque: z.boolean().default(true),
  estoqueMinimo: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
});

export type ProdutoDTO = z.infer<typeof ProdutoSchema> & { 
  id: string; 
  clinicaId: string;
  categoria?: CategoriaProdutoDTO;
  estoqueAtual?: number;
};

export const EstoqueLoteSchema = z.object({
  id: z.string().optional(),
  produtoId: z.string(),
  numeroLote: z.string().min(1, 'Número do lote é obrigatório'),
  dataValidade: z.string().optional(), // ISO date string
  quantidade: z.number().int(),
});

export type EstoqueLoteDTO = z.infer<typeof EstoqueLoteSchema> & { id: string; clinicaId: string };

export const MovimentacaoEstoqueSchema = z.object({
  id: z.string().optional(),
  produtoId: z.string(),
  loteId: z.string().optional(),
  tipo: z.nativeEnum(TipoMovimentacao),
  quantidade: z.number().int().min(1),
  motivo: z.string().optional(),
  documentoReferencia: z.string().optional(), // ex: "FT 2026/001"
});

export type MovimentacaoEstoqueDTO = z.infer<typeof MovimentacaoEstoqueSchema> & { 
  id: string; 
  clinicaId: string; 
  utilizadorId: string;
  criadoEm: string;
};
