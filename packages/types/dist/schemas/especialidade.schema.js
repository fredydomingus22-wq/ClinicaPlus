"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EspecialidadeListQuerySchema = exports.EspecialidadeUpdateSchema = exports.EspecialidadeCreateSchema = void 0;
const zod_1 = require("zod");
exports.EspecialidadeCreateSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
    descricao: zod_1.z.string().max(500).optional(),
    ativo: zod_1.z.boolean().default(true),
});
exports.EspecialidadeUpdateSchema = exports.EspecialidadeCreateSchema.partial();
exports.EspecialidadeListQuerySchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    ativo: zod_1.z.coerce.boolean().optional(),
});
//# sourceMappingURL=especialidade.schema.js.map