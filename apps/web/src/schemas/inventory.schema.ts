import { z } from 'zod';

/**
 * Zod schemas para validação de formulários do módulo de inventário/stock no frontend
 * Baseados nos schemas do backend (apps/api/src/schemas/inventory.schema.ts)
 * Mantém consistência com a arquitetura atual do projeto
 */

// Categoria
export const CreateCategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  descricao: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  cor: z.string().max(20, 'Cor deve ter no máximo 20 caracteres').optional(),
});

// Produto
export const CreateProdutoSchema = z.object({
  categoriaId: z.string().min(1, 'Categoria é obrigatória'),
  codigo: z.string().max(50, 'Código deve ter no máximo 50 caracteres').optional(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
  descricao: z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres').optional(),
  precoCusto: z.number().int('Preço de custo deve ser inteiro').min(0, 'Preço de custo não pode ser negativo').default(0),
  precoVenda: z.number().int('Preço de venda deve ser inteiro').min(0, 'Preço de venda não pode ser negativo').default(0),
  taxaIva: z.number().min(0, 'Taxa de IVA não pode ser negativa').max(100, 'Taxa de IVA não pode exceder 100').default(14),
  codigoIva: z.string().max(10, 'Código de IVA deve ter no máximo 10 caracteres').default('IVA'),
  motivoIsencao: z.string().max(500, 'Motivo de isenção deve ter no máximo 500 caracteres').optional(),
  tipo: z.enum(['PRODUTO', 'SERVICO'], { errorMap: () => ({ message: 'Tipo deve ser PRODUTO ou SERVICO' }) }).default('PRODUTO'),
  gerenciaEstoque: z.boolean().default(true),
  estoqueMinimo: z.number().int('Estoque mínimo deve ser inteiro').min(0, 'Estoque mínimo não pode ser negativo').default(0),
});

export const UpdateProdutoSchema = CreateProdutoSchema.partial();

// Lote
export const CreateLoteSchema = z.object({
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  numeroLote: z.string().min(1, 'Número do lote é obrigatório').max(50, 'Número do lote deve ter no máximo 50 caracteres'),
  dataValidade: z.string().optional(),
  quantidade: z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser positiva'),
});

// Movimentação de Estoque
export const MovimentarEstoqueSchema = z.object({
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  loteId: z.string().optional(),
  quantidade: z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser positiva'),
  tipo: z.enum(['ENTRADA', 'SAIDA', 'VENDA', 'AJUSTE', 'TRANSFERENCIA'], {
    errorMap: () => ({ message: 'Tipo deve ser ENTRADA, SAIDA, VENDA, AJUSTE ou TRANSFERENCIA' }),
  }),
  motivo: z.string().max(500, 'Motivo deve ter no máximo 500 caracteres').optional(),
  documentoRef: z.string().max(100, 'Referência do documento deve ter no máximo 100 caracteres').optional(),
});

// Type exports
export type CreateCategoriaInput = z.infer<typeof CreateCategoriaSchema>;
export type CreateProdutoInput = z.infer<typeof CreateProdutoSchema>;
export type UpdateProdutoInput = z.infer<typeof UpdateProdutoSchema>;
export type CreateLoteInput = z.infer<typeof CreateLoteSchema>;
export type MovimentarEstoqueInput = z.infer<typeof MovimentarEstoqueSchema>;
