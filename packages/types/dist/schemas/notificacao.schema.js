"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificacaoCreateSchema = exports.NotificacaoSchema = exports.NotificacaoTipoSchema = void 0;
const zod_1 = require("zod");
exports.NotificacaoTipoSchema = zod_1.z.enum([
    'INFO',
    'SUCESSO',
    'AVISO',
    'ERRO',
    'AGENDAMENTO',
    'RECEITA'
]);
exports.NotificacaoSchema = zod_1.z.object({
    id: zod_1.z.string().cuid(),
    utilizadorId: zod_1.z.string().cuid(),
    titulo: zod_1.z.string().min(1),
    mensagem: zod_1.z.string().min(1),
    tipo: exports.NotificacaoTipoSchema,
    lida: zod_1.z.boolean(),
    url: zod_1.z.string().optional(),
    criadoEm: zod_1.z.date(),
});
exports.NotificacaoCreateSchema = exports.NotificacaoSchema.omit({
    id: true,
    lida: true,
    criadoEm: true,
});
//# sourceMappingURL=notificacao.schema.js.map