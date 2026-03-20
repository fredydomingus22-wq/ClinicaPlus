import { z } from 'zod';
import { EscopoApiKeySchema, EventoWebhookSchema } from '../enums';

export const ApiKeyCreateSchema = z.object({
  nome: z.string().min(3).max(50),
  escopos: z.array(EscopoApiKeySchema).min(1),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type ApiKeyCreateInput = z.infer<typeof ApiKeyCreateSchema>;

export const ApiKeyDTOSchema = z.object({
  id: z.string(),
  nome: z.string(),
  prefixo: z.string(),
  escopos: z.array(EscopoApiKeySchema),
  ativo: z.boolean(),
  ultimoUso: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  criadoEm: z.string().datetime(),
});

export type ApiKeyDTO = z.infer<typeof ApiKeyDTOSchema>;

export const ApiKeyResponseSchema = z.object({
  ...ApiKeyDTOSchema.shape,
  token: z.string().optional(), // Só devolvido na criação
});

export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;

export const WebhookCreateSchema = z.object({
  nome: z.string().min(3).max(50),
  url: z.string().url(),
  eventos: z.array(EventoWebhookSchema).min(1),
  ativo: z.boolean().optional().default(true),
});

export type WebhookCreateInput = z.infer<typeof WebhookCreateSchema>;

export const WebhookUpdateSchema = WebhookCreateSchema.partial();

export type WebhookUpdateInput = z.infer<typeof WebhookUpdateSchema>;

export const WebhookDTOSchemas = z.object({
  id: z.string(),
  clinicaId: z.string(),
  nome: z.string(),
  url: z.string(),
  eventos: z.array(EventoWebhookSchema),
  ativo: z.boolean(),
  ultimoStatus: z.number().nullable(),
  sucesso: z.boolean().nullable(),
  criadoEm: z.string().datetime(),
});

export type WebhookDTO = z.infer<typeof WebhookDTOSchemas>;

export const WebhookEntregaDTOSchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  evento: EventoWebhookSchema,
  url: z.string(),
  sucesso: z.boolean(),
  statusHttp: z.number().nullable(),
  resposta: z.string().nullable(),
  tentativas: z.number(),
  concluidoEm: z.string().datetime().nullable(),
  criadoEm: z.string().datetime(),
});

export type WebhookEntregaDTO = z.infer<typeof WebhookEntregaDTOSchema>;
