import { z } from 'zod';

export const PacienteCreateSchema = z.object({
  nome: z.string().min(3).max(100).trim(),
  email: z.string().email().max(100).trim().toLowerCase().optional().or(z.literal('')),
  // Accept both formats used in practice:
  // - 9 digits: 009122079
  // - 9 digits + suffix: 009122079LA040
  nif: z
    .string({ required_error: 'NIF e obrigatorio' })
    .trim()
    .regex(/^(?:\d{9}|\d{9}[A-Za-z]{2}\d{3})$/, 'Formato de NIF invalido. Exemplo: 009122079 ou 009122079LA040'),
  telefone: z.string().max(20).trim().optional(),
  dataNascimento: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de nascimento invalida',
  }),
  genero: z.enum(['M', 'F', 'OUTRO']),
  tipoSangue: z.string().max(5).trim().optional(),
  alergias: z
    .union([
      z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),
      z.array(z.string().trim()),
    ])
    .default([]),
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
