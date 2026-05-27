"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovimentacaoEstoqueSchema = exports.EstoqueLoteSchema = exports.ProdutoSchema = exports.CategoriaProdutoSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.CategoriaProdutoSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    nome: zod_1.z.string().min(2, 'Nome da categoria deve ter pelo menos 2 caracteres'),
    descricao: zod_1.z.string().optional(),
    cor: zod_1.z.string().optional(),
    ativo: zod_1.z.boolean().default(true),
});
exports.ProdutoSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    categoriaId: zod_1.z.string().min(1, 'Categoria é obrigatória'),
    codigo: zod_1.z.string().optional(), // SKU/Referência
    nome: zod_1.z.string().min(2, 'Nome do produto deve ter pelo menos 2 caracteres'),
    descricao: zod_1.z.string().optional(),
    precoCusto: zod_1.z.number().int().min(0).default(0),
    precoVenda: zod_1.z.number().int().min(0),
    taxaIva: zod_1.z.number().min(0).max(14).default(14),
    codigoIva: zod_1.z.string().default('IVA'),
    motivoIsencao: zod_1.z.string().optional(),
    tipo: zod_1.z.nativeEnum(enums_1.TipoProduto).default(enums_1.TipoProduto.PRODUTO),
    gerenciaEstoque: zod_1.z.boolean().default(true),
    estoqueMinimo: zod_1.z.number().int().min(0).default(0),
    ativo: zod_1.z.boolean().default(true),
});
exports.EstoqueLoteSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    produtoId: zod_1.z.string(),
    numeroLote: zod_1.z.string().min(1, 'Número do lote é obrigatório'),
    dataValidade: zod_1.z.string().optional(), // ISO date string
    quantidade: zod_1.z.number().int(),
});
exports.MovimentacaoEstoqueSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    produtoId: zod_1.z.string(),
    loteId: zod_1.z.string().optional(),
    tipo: zod_1.z.nativeEnum(enums_1.TipoMovimentacao),
    quantidade: zod_1.z.number().int().min(1),
    motivo: zod_1.z.string().optional(),
    documentoReferencia: zod_1.z.string().optional(), // ex: "FT 2026/001"
});
//# sourceMappingURL=inventory.schema.js.map