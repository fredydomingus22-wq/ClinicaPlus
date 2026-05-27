"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaftExportSchema = exports.ConfiguracaoFiscalSchema = exports.CriarNotaCreditoSchema = exports.CriarPagamentoSchema = exports.CriarFaturaSchema = exports.ItemFaturaInputSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
// ─── ITEM DE FATURA
exports.ItemFaturaInputSchema = zod_1.z.object({
    descricao: zod_1.z.string().min(1, "Descrição é obrigatória").max(500),
    quantidade: zod_1.z.number().int().min(1, "Quantidade mínima é 1").max(9999),
    precoUnit: zod_1.z.number().int().min(0, "Preço não pode ser negativo"), // Valor em Kwanza (Inteiro)
    desconto: zod_1.z.number().int().min(0).default(0),
    taxaIva: zod_1.z.number().min(0).max(100).optional(), // Override se necessário
    codigoIva: zod_1.z.string().max(10).optional(),
    motivoIsencao: zod_1.z.string().max(200).optional(),
});
// ─── CRIAR FATURA (RASCUNHO)
exports.CriarFaturaSchema = zod_1.z.object({
    pacienteId: zod_1.z.string().min(1, "Paciente é obrigatório"),
    agendamentoId: zod_1.z.string().optional(),
    medicoId: zod_1.z.string().optional(),
    tipo: zod_1.z.enum(["PARTICULAR", "SEGURO"]).default("PARTICULAR"),
    notas: zod_1.z.string().max(1000).optional(),
    itens: zod_1.z.array(exports.ItemFaturaInputSchema).min(1, "Mínimo 1 item obrigatório"),
});
// ─── REGISTAR PAGAMENTO
exports.CriarPagamentoSchema = zod_1.z.object({
    metodo: enums_1.MetodoPagamentoSchema,
    valor: zod_1.z.number().int().min(1, "Valor deve ser superior a zero"), // Kwanza
    referencia: zod_1.z.string().max(100).optional(),
    notas: zod_1.z.string().max(500).optional(),
});
// ─── CRIAR NOTA DE CRÉDITO
exports.CriarNotaCreditoSchema = zod_1.z.object({
    motivo: zod_1.z.string().min(5, "Descreva o motivo da anulação (mín. 5 carateres)").max(500),
    itens: zod_1.z.array(exports.ItemFaturaInputSchema).optional(), // Se omitido, anula totalmente
});
// ─── CONFIGURAÇÃO FISCAL DA CLÍNICA
exports.ConfiguracaoFiscalSchema = zod_1.z.object({
    tipoEntidade: zod_1.z.enum(['SINGULAR', 'EMPRESA']).default('EMPRESA'),
    nif: zod_1.z.string().min(9, 'NIF muito curto').max(13, 'NIF muito longo'),
    razaoSocial: zod_1.z.string().min(3, "Razão Social muito curta").max(200),
    enderecoPostal: zod_1.z.string().min(5, "Endereço deve ser completo").max(500),
    cidade: zod_1.z.string().min(2).max(100).optional(),
    provincia: zod_1.z.string().min(2).max(100).optional(),
    regimeFiscal: enums_1.RegimeFiscalSchema,
    serieDocFiscal: zod_1.z.string().min(2).max(10).default("CPLS"),
    agtSoftwareCert: zod_1.z.string().max(100).optional(),
}).refine(data => {
    if (data.tipoEntidade === 'EMPRESA')
        return data.nif.length === 10;
    if (data.tipoEntidade === 'SINGULAR')
        return data.nif.length === 13;
    // Fallback para legado ou outros casos que possam ter 9 dígitos (se permitido pela AGT em algum contexto)
    return data.nif.length >= 9;
}, {
    message: "NIF inválido para o tipo de entidade selecionado (Empresa: 10 dígitos, Singular: 13 dígitos)",
    path: ["nif"]
});
// ─── PARÂMETROS DE EXPORTAÇÃO SAF-T
exports.SaftExportSchema = zod_1.z.object({
    ano: zod_1.z.coerce.number().int().min(2020).max(2099),
    mes: zod_1.z.coerce.number().int().min(1).max(12).optional(),
});
//# sourceMappingURL=faturacao.js.map