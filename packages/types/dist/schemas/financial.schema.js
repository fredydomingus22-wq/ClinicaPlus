"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeguroUpdateSchema = exports.NotaDebitoCreateSchema = exports.PagamentoCreateSchema = exports.FaturaUpdateSchema = exports.FaturaCreateSchema = exports.ItemFacturavelSelectSchema = exports.ItemFaturaSchema = exports.TipoItemFatura = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
var TipoItemFatura;
(function (TipoItemFatura) {
    TipoItemFatura["PRODUTO"] = "PRODUTO";
    TipoItemFatura["TRATAMENTO"] = "TRATAMENTO";
    TipoItemFatura["EXAME"] = "EXAME";
    TipoItemFatura["CONSULTA"] = "CONSULTA";
    TipoItemFatura["SERVICO"] = "SERVICO";
})(TipoItemFatura || (exports.TipoItemFatura = TipoItemFatura = {}));
exports.ItemFaturaSchema = zod_1.z.object({
    tipoItem: zod_1.z.nativeEnum(TipoItemFatura).default(TipoItemFatura.SERVICO),
    // Campos polimórficos
    produtoId: zod_1.z.string().optional(),
    tratamentoId: zod_1.z.string().optional(),
    exameId: zod_1.z.string().optional(),
    medicoId: zod_1.z.string().optional(),
    descricao: zod_1.z.string().min(1, 'Descrição é obrigatória'),
    quantidade: zod_1.z.number().int().min(1).default(1),
    precoUnit: zod_1.z.number().int().min(0),
    desconto: zod_1.z.number().int().min(0).default(0),
    taxaIva: zod_1.z.number().min(0).max(14).default(0),
    codigoIva: zod_1.z.string().default('ISE'),
    motivoIsencao: zod_1.z.string().optional(),
}).refine(data => {
    // Validação: pelo menos um ID deve corresponder ao tipoItem
    if (data.tipoItem === TipoItemFatura.PRODUTO && !data.produtoId) {
        return false;
    }
    if (data.tipoItem === TipoItemFatura.TRATAMENTO && !data.tratamentoId) {
        return false;
    }
    if (data.tipoItem === TipoItemFatura.EXAME && !data.exameId) {
        return false;
    }
    if (data.tipoItem === TipoItemFatura.CONSULTA && !data.medicoId) {
        return false;
    }
    // SERVICO não requer ID
    return true;
}, {
    message: "ID do item é obrigatório para o tipo selecionado",
});
exports.ItemFacturavelSelectSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tipo: zod_1.z.nativeEnum(TipoItemFatura),
    nome: zod_1.z.string(),
    codigo: zod_1.z.string().nullable(),
    preco: zod_1.z.number(),
    taxaIva: zod_1.z.number(),
    codigoIva: zod_1.z.string(),
    motivoIsencao: zod_1.z.string().nullable(),
    estoqueAtual: zod_1.z.number().optional(), // Apenas para PRODUTO
    gerenciaEstoque: zod_1.z.boolean().optional(), // Apenas para PRODUTO
});
exports.FaturaCreateSchema = zod_1.z.object({
    agendamentoId: zod_1.z.string().optional(),
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string().optional(),
    tipo: zod_1.z.nativeEnum(enums_1.TipoFatura).default(enums_1.TipoFatura.PARTICULAR),
    tipoDocFiscal: zod_1.z.nativeEnum(enums_1.TipoDocumentoFiscal).default(enums_1.TipoDocumentoFiscal.FT),
    itens: zod_1.z.array(exports.ItemFaturaSchema).min(1, 'Pelo menos um item é obrigatório'),
    desconto: zod_1.z.number().int().min(0).default(0),
    retencaoFonte: zod_1.z.number().int().min(0).default(0),
    notas: zod_1.z.string().optional(),
    dataEmissao: zod_1.z.string().optional(), // Retrodatação
    retrodatar: zod_1.z.boolean().default(false),
    dataVencimento: zod_1.z.string().optional(),
});
exports.FaturaUpdateSchema = exports.FaturaCreateSchema.partial().extend({
    estado: zod_1.z.nativeEnum(enums_1.EstadoFatura).optional(),
});
exports.PagamentoCreateSchema = zod_1.z.object({
    faturaId: zod_1.z.string(),
    metodo: zod_1.z.nativeEnum(enums_1.MetodoPagamento),
    valor: zod_1.z.number().int().min(1),
    referencia: zod_1.z.string().optional(),
    notas: zod_1.z.string().optional(),
    seguro: zod_1.z.object({
        seguradora: zod_1.z.string(),
        numeroBeneficiario: zod_1.z.string(),
        numeroAutorizacao: zod_1.z.string().optional(),
        valorSolicitado: zod_1.z.number().int().min(1),
    }).optional(),
});
exports.NotaDebitoCreateSchema = zod_1.z.object({
    motivo: zod_1.z.string().min(1, 'Motivo é obrigatório'),
    itens: zod_1.z.array(exports.ItemFaturaSchema).min(1, 'Pelo menos um item é obrigatório'),
});
exports.SeguroUpdateSchema = zod_1.z.object({
    estado: zod_1.z.nativeEnum(enums_1.EstadoSeguro),
    valorAprovado: zod_1.z.number().int().optional(),
    numeroAutorizacao: zod_1.z.string().optional(),
    notasSeguradora: zod_1.z.string().optional(),
});
//# sourceMappingURL=financial.schema.js.map