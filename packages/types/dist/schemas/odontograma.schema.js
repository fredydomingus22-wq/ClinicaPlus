"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OdontogramaUpdateSchema = exports.OdontogramaCreateSchema = exports.OdontogramaSchema = exports.OdontogramaMarcacaoSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.OdontogramaMarcacaoSchema = zod_1.z.object({
    numeroDente: zod_1.z.number().int().min(11).max(48),
    face: enums_1.DenteFaceSchema,
    status: enums_1.DenteStatusSchema,
    observacao: zod_1.z.string().max(500).trim().optional(),
});
exports.OdontogramaSchema = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string(),
    marcacoes: zod_1.z.array(exports.OdontogramaMarcacaoSchema),
    criadoEm: zod_1.z.date().or(zod_1.z.string()),
    atualizadoEm: zod_1.z.date().or(zod_1.z.string()),
});
exports.OdontogramaCreateSchema = zod_1.z.object({
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string(),
    marcacoes: zod_1.z.array(exports.OdontogramaMarcacaoSchema).default([]),
});
exports.OdontogramaUpdateSchema = zod_1.z.object({
    marcacoes: zod_1.z.array(exports.OdontogramaMarcacaoSchema),
});
//# sourceMappingURL=odontograma.schema.js.map