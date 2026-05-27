import { z } from 'zod';
export declare const ApiKeyCreateSchema: z.ZodObject<{
    nome: z.ZodString;
    escopos: z.ZodArray<z.ZodNativeEnum<typeof import("../enums").EscopoApiKey>, "many">;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    escopos: import("../enums").EscopoApiKey[];
    expiresAt?: string | null | undefined;
}, {
    nome: string;
    escopos: import("../enums").EscopoApiKey[];
    expiresAt?: string | null | undefined;
}>;
export type ApiKeyCreateInput = z.infer<typeof ApiKeyCreateSchema>;
export declare const ApiKeyDTOSchema: z.ZodObject<{
    id: z.ZodString;
    nome: z.ZodString;
    prefixo: z.ZodString;
    escopos: z.ZodArray<z.ZodNativeEnum<typeof import("../enums").EscopoApiKey>, "many">;
    ativo: z.ZodBoolean;
    ultimoUso: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    criadoEm: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    id: string;
    criadoEm: string;
    escopos: import("../enums").EscopoApiKey[];
    prefixo: string;
    expiresAt?: string | null | undefined;
    ultimoUso?: string | null | undefined;
}, {
    ativo: boolean;
    nome: string;
    id: string;
    criadoEm: string;
    escopos: import("../enums").EscopoApiKey[];
    prefixo: string;
    expiresAt?: string | null | undefined;
    ultimoUso?: string | null | undefined;
}>;
export type ApiKeyDTO = z.infer<typeof ApiKeyDTOSchema>;
export declare const ApiKeyResponseSchema: z.ZodObject<{
    token: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    nome: z.ZodString;
    prefixo: z.ZodString;
    escopos: z.ZodArray<z.ZodNativeEnum<typeof import("../enums").EscopoApiKey>, "many">;
    ativo: z.ZodBoolean;
    ultimoUso: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    criadoEm: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    id: string;
    criadoEm: string;
    escopos: import("../enums").EscopoApiKey[];
    prefixo: string;
    token?: string | undefined;
    expiresAt?: string | null | undefined;
    ultimoUso?: string | null | undefined;
}, {
    ativo: boolean;
    nome: string;
    id: string;
    criadoEm: string;
    escopos: import("../enums").EscopoApiKey[];
    prefixo: string;
    token?: string | undefined;
    expiresAt?: string | null | undefined;
    ultimoUso?: string | null | undefined;
}>;
export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;
export declare const WebhookCreateSchema: z.ZodObject<{
    nome: z.ZodString;
    url: z.ZodString;
    eventos: z.ZodArray<z.ZodNativeEnum<typeof import("../enums").EventoWebhook>, "many">;
    ativo: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    url: string;
    eventos: import("../enums").EventoWebhook[];
}, {
    nome: string;
    url: string;
    eventos: import("../enums").EventoWebhook[];
    ativo?: boolean | undefined;
}>;
export type WebhookCreateInput = z.infer<typeof WebhookCreateSchema>;
export declare const WebhookUpdateSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    eventos: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<typeof import("../enums").EventoWebhook>, "many">>;
    ativo: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
}, "strip", z.ZodTypeAny, {
    ativo?: boolean | undefined;
    nome?: string | undefined;
    url?: string | undefined;
    eventos?: import("../enums").EventoWebhook[] | undefined;
}, {
    ativo?: boolean | undefined;
    nome?: string | undefined;
    url?: string | undefined;
    eventos?: import("../enums").EventoWebhook[] | undefined;
}>;
export type WebhookUpdateInput = z.infer<typeof WebhookUpdateSchema>;
export declare const WebhookDTOSchemas: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    nome: z.ZodString;
    url: z.ZodString;
    eventos: z.ZodArray<z.ZodNativeEnum<typeof import("../enums").EventoWebhook>, "many">;
    ativo: z.ZodBoolean;
    ultimoStatus: z.ZodNullable<z.ZodNumber>;
    sucesso: z.ZodNullable<z.ZodBoolean>;
    criadoEm: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    id: string;
    url: string;
    criadoEm: string;
    clinicaId: string;
    eventos: import("../enums").EventoWebhook[];
    ultimoStatus: number | null;
    sucesso: boolean | null;
}, {
    ativo: boolean;
    nome: string;
    id: string;
    url: string;
    criadoEm: string;
    clinicaId: string;
    eventos: import("../enums").EventoWebhook[];
    ultimoStatus: number | null;
    sucesso: boolean | null;
}>;
export type WebhookDTO = z.infer<typeof WebhookDTOSchemas>;
export declare const WebhookEntregaDTOSchema: z.ZodObject<{
    id: z.ZodString;
    webhookId: z.ZodString;
    evento: z.ZodNativeEnum<typeof import("../enums").EventoWebhook>;
    url: z.ZodString;
    sucesso: z.ZodBoolean;
    statusHttp: z.ZodNullable<z.ZodNumber>;
    resposta: z.ZodNullable<z.ZodString>;
    tentativas: z.ZodNumber;
    concluidoEm: z.ZodNullable<z.ZodString>;
    criadoEm: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    url: string;
    criadoEm: string;
    sucesso: boolean;
    webhookId: string;
    evento: import("../enums").EventoWebhook;
    statusHttp: number | null;
    resposta: string | null;
    tentativas: number;
    concluidoEm: string | null;
}, {
    id: string;
    url: string;
    criadoEm: string;
    sucesso: boolean;
    webhookId: string;
    evento: import("../enums").EventoWebhook;
    statusHttp: number | null;
    resposta: string | null;
    tentativas: number;
    concluidoEm: string | null;
}>;
export type WebhookEntregaDTO = z.infer<typeof WebhookEntregaDTOSchema>;
//# sourceMappingURL=platform.schema.d.ts.map