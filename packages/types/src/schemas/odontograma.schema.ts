import { z } from 'zod';
import { DenteFaceSchema, DenteStatusSchema } from '../enums';

export const OdontogramaMarcacaoSchema = z.object({
  numeroDente: z.number().int().min(11).max(48),
  face: DenteFaceSchema,
  status: DenteStatusSchema,
  observacao: z.string().max(500).trim().optional(),
});

export const OdontogramaSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string(),
  marcacoes: z.array(OdontogramaMarcacaoSchema),
  criadoEm: z.date().or(z.string()),
  atualizadoEm: z.date().or(z.string()),
});

export const OdontogramaCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string(),
  marcacoes: z.array(OdontogramaMarcacaoSchema).default([]),
});

export const OdontogramaUpdateSchema = z.object({
  marcacoes: z.array(OdontogramaMarcacaoSchema),
});

export type OdontogramaMarcacao = z.infer<typeof OdontogramaMarcacaoSchema>;
export type OdontogramaDTO = z.infer<typeof OdontogramaSchema>;
export type OdontogramaCreateInput = z.infer<typeof OdontogramaCreateSchema>;
export type OdontogramaUpdateInput = z.infer<typeof OdontogramaUpdateSchema>;
