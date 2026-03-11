import { z } from 'zod';
import { TipoDocumentoSchema } from '../enums';

export const DocumentoSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  pacienteId: z.string(),
  medicoId: z.string().optional().nullable(),
  agendamentoId: z.string().optional().nullable(),
  tipo: TipoDocumentoSchema,
  nome: z.string(),
  url: z.string(),
  criadoEm: z.date().or(z.string()),
});

export const DocumentoCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string().optional(),
  agendamentoId: z.string().optional(),
  tipo: TipoDocumentoSchema,
  nome: z.string(),
  url: z.string(),
});

export type DocumentoCreateInput = z.infer<typeof DocumentoCreateSchema>;
