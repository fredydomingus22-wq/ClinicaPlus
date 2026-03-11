import { z } from 'zod';

export const EspecialidadeCreateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  descricao: z.string().max(500).optional(),
  ativo: z.boolean().default(true),
});

export const EspecialidadeUpdateSchema = EspecialidadeCreateSchema.partial();

export const EspecialidadeListQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ativo: z.coerce.boolean().optional(),
});

export type EspecialidadeCreateInput = z.infer<typeof EspecialidadeCreateSchema>;
export type EspecialidadeUpdateInput = z.infer<typeof EspecialidadeUpdateSchema>;
export type EspecialidadeListQuery = z.infer<typeof EspecialidadeListQuerySchema>;
