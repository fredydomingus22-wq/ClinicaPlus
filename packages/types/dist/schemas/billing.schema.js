"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionStatusSchema = exports.BillingHistorySchema = exports.FaturaAssinaturaSchema = exports.SubscricaoSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.SubscricaoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    plano: zod_1.z.nativeEnum(enums_1.Plano),
    estado: zod_1.z.nativeEnum(enums_1.EstadoSubscricao),
    inicioEm: zod_1.z.string(),
    validaAte: zod_1.z.string(),
    trialAte: zod_1.z.string().nullable().optional(),
    valorKz: zod_1.z.number().int().nullable().optional(),
    referenciaInterna: zod_1.z.string().nullable().optional(),
    razao: zod_1.z.nativeEnum(enums_1.RazaoMudancaPlano),
    planoAnterior: zod_1.z.nativeEnum(enums_1.Plano).nullable().optional(),
    alteradoPor: zod_1.z.string(),
    notas: zod_1.z.string().nullable().optional(),
    criadoEm: zod_1.z.string(),
});
exports.FaturaAssinaturaSchema = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    numero: zod_1.z.string(),
    valor: zod_1.z.number().int(),
    moeda: zod_1.z.string(),
    status: zod_1.z.enum(['PAGO', 'PENDENTE', 'CANCELADO', 'VENCIDO']),
    dataEmissao: zod_1.z.string(),
    dataPagamento: zod_1.z.string().nullable().optional(),
    dataVencimento: zod_1.z.string(),
    urlPdf: zod_1.z.string().nullable().optional(),
});
exports.BillingHistorySchema = zod_1.z.array(exports.FaturaAssinaturaSchema);
exports.SubscriptionStatusSchema = zod_1.z.object({
    plano: zod_1.z.nativeEnum(enums_1.Plano),
    status: zod_1.z.string(),
    proximaFatura: zod_1.z.string(),
    diasRestantes: zod_1.z.number(),
});
//# sourceMappingURL=billing.schema.js.map