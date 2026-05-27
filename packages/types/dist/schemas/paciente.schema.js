"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacienteListQuerySchema = exports.PacienteUpdateSchema = exports.PacienteCreateSchema = void 0;
const zod_1 = require("zod");
exports.PacienteCreateSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(100).trim(),
    email: zod_1.z.string().email().max(100).trim().toLowerCase().optional().or(zod_1.z.literal('')),
    // Accept both formats used in practice:
    // - 9 digits: 009122079
    // - 9 digits + suffix: 009122079LA040
    nif: zod_1.z
        .string({ required_error: 'NIF e obrigatorio' })
        .trim()
        .regex(/^(?:\d{9}|\d{9}[A-Za-z]{2}\d{3})$/, 'Formato de NIF invalido. Exemplo: 009122079 ou 009122079LA040'),
    telefone: zod_1.z.string().max(20).trim().optional(),
    dataNascimento: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Data de nascimento invalida',
    }),
    genero: zod_1.z.enum(['M', 'F', 'OUTRO']),
    tipoSangue: zod_1.z.string().max(5).trim().optional(),
    alergias: zod_1.z
        .union([
        zod_1.z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),
        zod_1.z.array(zod_1.z.string().trim()),
    ])
        .default([]),
    endereco: zod_1.z.string().max(255).trim().optional(),
    provincia: zod_1.z.string().max(100).trim().optional(),
    seguroSaude: zod_1.z.boolean().default(false),
    seguradora: zod_1.z.string().max(100).trim().optional(),
    ativo: zod_1.z.boolean().default(true),
});
exports.PacienteUpdateSchema = exports.PacienteCreateSchema.partial();
exports.PacienteListQuerySchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    provincia: zod_1.z.string().optional(),
    ativo: zod_1.z.coerce.boolean().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=paciente.schema.js.map