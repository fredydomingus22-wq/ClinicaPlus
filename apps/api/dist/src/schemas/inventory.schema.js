"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsFiltersSchema = exports.ListMovimentacoesSchema = exports.ListLotesSchema = exports.ListProdutosSchema = exports.MovimentarEstoqueSchema = exports.UpdateLoteSchema = exports.CreateLoteSchema = exports.UpdateProdutoSchema = exports.CreateProdutoSchema = exports.UpdateCategoriaSchema = exports.CreateCategoriaSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod schemas para validação de input do módulo de inventário/stock
 * Mantém consistência com a arquitetura atual do projeto (Express + Prisma + TypeScript)
 */
// Categoria
exports.CreateCategoriaSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
    descricao: zod_1.z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
    cor: zod_1.z.string().max(20, 'Cor deve ter no máximo 20 caracteres').optional(),
});
exports.UpdateCategoriaSchema = exports.CreateCategoriaSchema.partial();
// Produto
exports.CreateProdutoSchema = zod_1.z.object({
    categoriaId: zod_1.z.string().cuid('ID da categoria inválido'),
    codigo: zod_1.z.string().max(50, 'Código deve ter no máximo 50 caracteres').optional(),
    nome: zod_1.z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
    descricao: zod_1.z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres').optional(),
    precoCusto: zod_1.z.number().int('Preço de custo deve ser inteiro').min(0, 'Preço de custo não pode ser negativo').default(0),
    precoVenda: zod_1.z.number().int('Preço de venda deve ser inteiro').min(0, 'Preço de venda não pode ser negativo').default(0),
    taxaIva: zod_1.z.number().min(0, 'Taxa de IVA não pode ser negativa').max(100, 'Taxa de IVA não pode exceder 100').default(14),
    codigoIva: zod_1.z.string().max(10, 'Código de IVA deve ter no máximo 10 caracteres').default('IVA'),
    motivoIsencao: zod_1.z.string().max(500, 'Motivo de isenção deve ter no máximo 500 caracteres').optional(),
    tipo: zod_1.z.enum(['PRODUTO', 'SERVICO'], { errorMap: () => ({ message: 'Tipo deve ser PRODUTO ou SERVICO' }) }).default('PRODUTO'),
    gerenciaEstoque: zod_1.z.boolean().default(true),
    estoqueMinimo: zod_1.z.number().int('Estoque mínimo deve ser inteiro').min(0, 'Estoque mínimo não pode ser negativo').default(0),
});
exports.UpdateProdutoSchema = exports.CreateProdutoSchema.partial();
// Lote
exports.CreateLoteSchema = zod_1.z.object({
    produtoId: zod_1.z.string().cuid('ID do produto inválido'),
    numeroLote: zod_1.z.string().min(1, 'Número do lote é obrigatório').max(50, 'Número do lote deve ter no máximo 50 caracteres'),
    dataValidade: zod_1.z.coerce.date().optional(),
    quantidade: zod_1.z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser positiva'),
});
exports.UpdateLoteSchema = exports.CreateLoteSchema.partial();
// Movimentação de Estoque
exports.MovimentarEstoqueSchema = zod_1.z.object({
    produtoId: zod_1.z.string().cuid('ID do produto inválido'),
    loteId: zod_1.z.string().cuid('ID do lote inválido').optional(),
    quantidade: zod_1.z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser positiva'),
    tipo: zod_1.z.enum(['ENTRADA', 'SAIDA', 'VENDA', 'AJUSTE', 'TRANSFERENCIA'], {
        errorMap: () => ({ message: 'Tipo deve ser ENTRADA, SAIDA, VENDA, AJUSTE ou TRANSFERENCIA' }),
    }),
    motivo: zod_1.z.string().max(500, 'Motivo deve ter no máximo 500 caracteres').optional(),
    documentoRef: zod_1.z.string().max(100, 'Referência do documento deve ter no máximo 100 caracteres').optional(),
});
// Filtros para listagem
exports.ListProdutosSchema = zod_1.z.object({
    categoriaId: zod_1.z.string().cuid().optional(),
    tipo: zod_1.z.enum(['PRODUTO', 'SERVICO']).optional(),
    busca: zod_1.z.string().max(100).optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
exports.ListLotesSchema = zod_1.z.object({
    produtoId: zod_1.z.string().cuid('ID do produto inválido'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
exports.ListMovimentacoesSchema = zod_1.z.object({
    produtoId: zod_1.z.string().cuid('ID do produto inválido'),
    loteId: zod_1.z.string().cuid().optional(),
    tipo: zod_1.z.enum(['ENTRADA', 'SAIDA', 'VENDA', 'AJUSTE', 'TRANSFERENCIA']).optional(),
    dataInicio: zod_1.z.coerce.date().optional(),
    dataFim: zod_1.z.coerce.date().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
// Analytics filters
exports.AnalyticsFiltersSchema = zod_1.z.object({
    dataInicio: zod_1.z.coerce.date().optional(),
    dataFim: zod_1.z.coerce.date().optional(),
    categoriaId: zod_1.z.string().cuid().optional(),
});
