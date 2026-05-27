"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicoSelfUpdateSchema = exports.MedicoSlotQuerySchema = exports.MedicoListQuerySchema = exports.MedicoUpdateSchema = exports.MedicoCreateSchema = exports.MedicoHorarioSchema = exports.HorarioDiaSchema = void 0;
const zod_1 = require("zod");
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const optionalTime = zod_1.z.string().regex(timeRegex).or(zod_1.z.literal('')).optional();
exports.HorarioDiaSchema = zod_1.z.object({
    ativo: zod_1.z.boolean(),
    inicio: optionalTime,
    fim: optionalTime,
    pausaInicio: optionalTime,
    pausaFim: optionalTime,
});
exports.MedicoHorarioSchema = zod_1.z.object({
    segunda: exports.HorarioDiaSchema,
    terca: exports.HorarioDiaSchema,
    quarta: exports.HorarioDiaSchema,
    quinta: exports.HorarioDiaSchema,
    sexta: exports.HorarioDiaSchema,
    sabado: exports.HorarioDiaSchema,
    domingo: exports.HorarioDiaSchema,
});
exports.MedicoCreateSchema = zod_1.z.object({
    utilizadorId: zod_1.z.string().optional(),
    email: zod_1.z.string().email('Email inválido').max(100).or(zod_1.z.literal('')).optional(),
    nome: zod_1.z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100).trim(),
    especialidadeId: zod_1.z.string().min(1, 'Selecione uma especialidade'),
    ordem: zod_1.z.string().max(50).trim().optional(),
    telefoneDireto: zod_1.z.string().max(20).trim().optional(),
    horario: exports.MedicoHorarioSchema,
    duracaoConsulta: zod_1.z.number().int().min(10).max(120).default(30),
    preco: zod_1.z.number().int().nonnegative(),
    ativo: zod_1.z.boolean().default(true),
});
exports.MedicoUpdateSchema = exports.MedicoCreateSchema.omit({
    utilizadorId: true,
    email: true
}).partial();
exports.MedicoListQuerySchema = zod_1.z.object({
    especialidadeId: zod_1.z.preprocess((val) => (val === 'null' || val === null || val === '' ? undefined : val), zod_1.z.string().optional()),
    ativo: zod_1.z.preprocess((val) => (val === 'null' || val === null || val === '' ? undefined : val), zod_1.z.coerce.boolean().optional()),
    page: zod_1.z.preprocess((val) => (val === '' ? undefined : val), zod_1.z.coerce.number().int().min(1).default(1)),
    limit: zod_1.z.preprocess((val) => (val === '' ? undefined : val), zod_1.z.coerce.number().int().min(1).max(100).default(20)),
});
exports.MedicoSlotQuerySchema = zod_1.z.object({
    data: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
/**
 * Fields the médico can update on their own profile.
 * Price, specialty and status are admin-only.
 */
exports.MedicoSelfUpdateSchema = zod_1.z.object({
    telefoneDireto: zod_1.z.string().max(20).trim().optional(),
    horario: exports.MedicoHorarioSchema.optional(),
    duracaoConsulta: zod_1.z.number().int().min(10).max(120).optional(),
});
//# sourceMappingURL=medico.schema.js.map