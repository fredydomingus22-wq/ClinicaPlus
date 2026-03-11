import { z } from 'zod';

export const MedicamentoSchema = z.object({
  nome: z.string().min(2).max(100).trim(),
  dosagem: z.string().max(100).trim(),
  frequencia: z.string().max(100).trim(),
  duracao: z.string().max(100).trim(),
  instrucoes: z.string().max(500).trim().optional(),
});

export const ReceitaCreateSchema = z.object({
  agendamentoId: z.string(),
  diagnostico: z.string().min(5).max(1000).trim(),
  medicamentos: z.array(MedicamentoSchema).min(1),
  observacoes: z.string().max(1000).trim().optional(),
  dataValidade: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data de validade inválida",
  }),
});

export const ReceitaListQuerySchema = z.object({
  pacienteId: z.string().optional(),
  medicoId: z.string().optional(),
  valida: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReceitaCreateInput = z.infer<typeof ReceitaCreateSchema>;
export type ReceitaListQuery = z.infer<typeof ReceitaListQuerySchema>;
export type Medicamento = z.infer<typeof MedicamentoSchema>;
