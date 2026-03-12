import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const optionalTime = z.string().regex(timeRegex).or(z.literal('')).optional();

export const HorarioDiaSchema = z.object({
  ativo: z.boolean(),
  inicio: optionalTime,
  fim: optionalTime,
  pausaInicio: optionalTime,
  pausaFim: optionalTime,
});

export const MedicoHorarioSchema = z.object({
  segunda: HorarioDiaSchema,
  terca: HorarioDiaSchema,
  quarta: HorarioDiaSchema,
  quinta: HorarioDiaSchema,
  sexta: HorarioDiaSchema,
  sabado: HorarioDiaSchema,
  domingo: HorarioDiaSchema,
});

export const MedicoCreateSchema = z.object({
  utilizadorId: z.string().optional(),
  email: z.string().email('Email inválido').max(100).or(z.literal('')).optional(),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100).trim(),
  especialidadeId: z.string().min(1, 'Selecione uma especialidade'),
  ordem: z.string().max(50).trim().optional(),
  telefoneDireto: z.string().max(20).trim().optional(),
  horario: MedicoHorarioSchema,
  duracaoConsulta: z.number().int().min(10).max(120).default(30),
  preco: z.number().int().nonnegative(),
  ativo: z.boolean().default(true),
});

export const MedicoUpdateSchema = MedicoCreateSchema.omit({
  utilizadorId: true,
  email: true
}).partial();

export const MedicoListQuerySchema = z.object({
  especialidadeId: z.string().optional(),
  ativo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const MedicoSlotQuerySchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type MedicoCreateInput = z.infer<typeof MedicoCreateSchema>;
export type MedicoUpdateInput = z.infer<typeof MedicoUpdateSchema>;
export type MedicoListQuery = z.infer<typeof MedicoListQuerySchema>;
export type MedicoSlotQuery = z.infer<typeof MedicoSlotQuerySchema>;
export type MedicoHorario = z.infer<typeof MedicoHorarioSchema>;

/**
 * Fields the médico can update on their own profile.
 * Price, specialty and status are admin-only.
 */
export const MedicoSelfUpdateSchema = z.object({
  telefoneDireto: z.string().max(20).trim().optional(),
  horario: MedicoHorarioSchema.optional(),
  duracaoConsulta: z.number().int().min(10).max(120).optional(),
});

export type MedicoSelfUpdateInput = z.infer<typeof MedicoSelfUpdateSchema>;
