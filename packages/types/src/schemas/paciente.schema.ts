import { z } from 'zod';

export const PacienteCreateSchema = z.object({
  nome: z.string().min(3).max(100).trim(),
  email: z.string().email().max(100).trim().toLowerCase().optional().or(z.literal('')),
  telefone: z.string().max(20).trim().optional(),
  dataNascimento: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data de nascimento inválida",
  }),
  genero: z.enum(['M', 'F', 'OUTRO']),
  tipoSangue: z.string().max(5).trim().optional(),
  alergias: z.array(z.string().trim()).default([]),
  endereco: z.string().max(255).trim().optional(),
  provincia: z.string().max(100).trim().optional(),
  seguroSaude: z.boolean().default(false),
  seguradora: z.string().max(100).trim().optional(),
  ativo: z.boolean().default(true),
});

export const PacienteUpdateSchema = PacienteCreateSchema.partial();

export const PacienteListQuerySchema = z.object({
  q: z.string().optional(),
  provincia: z.string().optional(),
  ativo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PacienteCreateInput = z.infer<typeof PacienteCreateSchema>;
export type PacienteUpdateInput = z.infer<typeof PacienteUpdateSchema>;
export type PacienteListQuery = z.infer<typeof PacienteListQuerySchema>;
