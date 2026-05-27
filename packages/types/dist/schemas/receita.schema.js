"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceitaListQuerySchema = exports.ReceitaCreateSchema = exports.MedicamentoSchema = void 0;
const zod_1 = require("zod");
exports.MedicamentoSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2).max(100).trim(),
    dosagem: zod_1.z.string().max(100).trim(),
    frequencia: zod_1.z.string().max(100).trim(),
    duracao: zod_1.z.string().max(100).trim(),
    instrucoes: zod_1.z.string().max(500).trim().optional(),
});
exports.ReceitaCreateSchema = zod_1.z.object({
    agendamentoId: zod_1.z.string(),
    diagnostico: zod_1.z.string().min(5).max(1000).trim(),
    medicamentos: zod_1.z.array(exports.MedicamentoSchema).min(1),
    observacoes: zod_1.z.string().max(1000).trim().optional(),
    dataValidade: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Data de validade inválida",
    }),
});
exports.ReceitaListQuerySchema = zod_1.z.object({
    pacienteId: zod_1.z.string().optional(),
    medicoId: zod_1.z.string().optional(),
    valida: zod_1.z.coerce.boolean().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=receita.schema.js.map