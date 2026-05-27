"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEntregaDTOSchema = exports.WebhookDTOSchemas = exports.WebhookUpdateSchema = exports.WebhookCreateSchema = exports.ApiKeyResponseSchema = exports.ApiKeyDTOSchema = exports.ApiKeyCreateSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.ApiKeyCreateSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(50),
    escopos: zod_1.z.array(enums_1.EscopoApiKeySchema).min(1),
    expiresAt: zod_1.z.string().datetime().optional().nullable(),
});
exports.ApiKeyDTOSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nome: zod_1.z.string(),
    prefixo: zod_1.z.string(),
    escopos: zod_1.z.array(enums_1.EscopoApiKeySchema),
    ativo: zod_1.z.boolean(),
    ultimoUso: zod_1.z.string().datetime().optional().nullable(),
    expiresAt: zod_1.z.string().datetime().optional().nullable(),
    criadoEm: zod_1.z.string().datetime(),
});
exports.ApiKeyResponseSchema = zod_1.z.object({
    ...exports.ApiKeyDTOSchema.shape,
    token: zod_1.z.string().optional(), // Só devolvido na criação
});
exports.WebhookCreateSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(50),
    url: zod_1.z.string().url(),
    eventos: zod_1.z.array(enums_1.EventoWebhookSchema).min(1),
    ativo: zod_1.z.boolean().optional().default(true),
});
exports.WebhookUpdateSchema = exports.WebhookCreateSchema.partial();
exports.WebhookDTOSchemas = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    nome: zod_1.z.string(),
    url: zod_1.z.string(),
    eventos: zod_1.z.array(enums_1.EventoWebhookSchema),
    ativo: zod_1.z.boolean(),
    ultimoStatus: zod_1.z.number().nullable(),
    sucesso: zod_1.z.boolean().nullable(),
    criadoEm: zod_1.z.string().datetime(),
});
exports.WebhookEntregaDTOSchema = zod_1.z.object({
    id: zod_1.z.string(),
    webhookId: zod_1.z.string(),
    evento: enums_1.EventoWebhookSchema,
    url: zod_1.z.string(),
    sucesso: zod_1.z.boolean(),
    statusHttp: zod_1.z.number().nullable(),
    resposta: zod_1.z.string().nullable(),
    tentativas: zod_1.z.number(),
    concluidoEm: zod_1.z.string().datetime().nullable(),
    criadoEm: zod_1.z.string().datetime(),
});
//# sourceMappingURL=platform.schema.js.map