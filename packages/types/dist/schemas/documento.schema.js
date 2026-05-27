"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentoCreateSchema = exports.DocumentoSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.DocumentoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string().optional().nullable(),
    agendamentoId: zod_1.z.string().optional().nullable(),
    tipo: enums_1.TipoDocumentoSchema,
    nome: zod_1.z.string(),
    url: zod_1.z.string(),
    criadoEm: zod_1.z.date().or(zod_1.z.string()),
});
exports.DocumentoCreateSchema = zod_1.z.object({
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string().optional(),
    agendamentoId: zod_1.z.string().optional(),
    tipo: enums_1.TipoDocumentoSchema,
    nome: zod_1.z.string(),
    url: zod_1.z.string(),
});
//# sourceMappingURL=documento.schema.js.map