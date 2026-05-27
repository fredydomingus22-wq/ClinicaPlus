"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipaCreateSchema = exports.UtilizadorListQuerySchema = exports.UtilizadorUpdateSchema = exports.UtilizadorCreateSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.UtilizadorCreateSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(100).trim(),
    email: zod_1.z.string().email().max(100).trim().toLowerCase(),
    password: zod_1.z.string().min(8).max(100),
    papel: enums_1.PapelSchema,
    ativo: zod_1.z.boolean().default(true),
});
exports.UtilizadorUpdateSchema = exports.UtilizadorCreateSchema.omit({
    password: true
}).partial();
exports.UtilizadorListQuerySchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    papel: enums_1.PapelSchema.optional(),
    ativo: zod_1.z.coerce.boolean().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.EquipaCreateSchema = exports.UtilizadorCreateSchema.omit({
    password: true,
});
//# sourceMappingURL=utilizador.schema.js.map