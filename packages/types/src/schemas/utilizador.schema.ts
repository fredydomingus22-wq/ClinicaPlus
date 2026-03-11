import { z } from 'zod';
import { PapelSchema } from '../enums';

export const UtilizadorCreateSchema = z.object({
  nome: z.string().min(3).max(100).trim(),
  email: z.string().email().max(100).trim().toLowerCase(),
  password: z.string().min(8).max(100),
  papel: PapelSchema,
  ativo: z.boolean().default(true),
});

export const UtilizadorUpdateSchema = UtilizadorCreateSchema.omit({
  password: true
}).partial();

export const UtilizadorListQuerySchema = z.object({
  q: z.string().optional(),
  papel: PapelSchema.optional(),
  ativo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const EquipaCreateSchema = UtilizadorCreateSchema.omit({
  password: true,
});

export type UtilizadorCreateInput = z.infer<typeof UtilizadorCreateSchema>;
export type UtilizadorUpdateInput = z.infer<typeof UtilizadorUpdateSchema>;
export type UtilizadorListQuery = z.infer<typeof UtilizadorListQuerySchema>;
export type EquipaCreateInput = z.infer<typeof EquipaCreateSchema>;
