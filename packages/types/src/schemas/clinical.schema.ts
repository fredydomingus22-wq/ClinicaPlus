import { z } from 'zod';
import { TipoExameSchema, TipoExame } from '../enums';

export const ProntuarioSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string().optional().nullable(),
  notas: z.string(),
  diagnostico: z.string().optional().nullable(),
  criadoEm: z.date().or(z.string()),
  atualizadoEm: z.date().or(z.string()),
});

export const ProntuarioCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string().optional(),
  notas: z.string().min(1, "As notas são obrigatórias"),
  diagnostico: z.string().optional(),
});

export const ExameSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string().optional().nullable(),
  nome: z.string(),
  tipo: TipoExameSchema,
  status: z.string(),
  resultado: z.string().optional().nullable(),
  dataPedido: z.date().or(z.string()),
  dataResultado: z.date().or(z.string()).optional().nullable(),
  criadoEm: z.date().or(z.string()),
  atualizadoEm: z.date().or(z.string()),
});


export const AnamneseSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string().optional().nullable(),
  especialidade: z.string(),
  respostas: z.record(z.any()), // { [questionId]: { value: any, observation?: string } }
  criadoEm: z.date().or(z.string()),
  atualizadoEm: z.date().or(z.string()),
});

export const AnamneseCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string().optional(),
  especialidade: z.string().default('ODONTOLOGIA'),
  respostas: z.record(z.any()),
});

export const AnamneseUpdateSchema = z.object({
  respostas: z.record(z.any()),
});

export const ExameCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  agendamentoId: z.string().optional(),
  nome: z.string().min(1, "O nome do exame é obrigatório"),
  tipo: TipoExameSchema,
  status: z.string().default('PENDENTE'),
});

export type AnamneseDTO = z.infer<typeof AnamneseSchema>;
export type AnamneseCreateInput = z.infer<typeof AnamneseCreateSchema>;
export type AnamneseUpdateInput = z.infer<typeof AnamneseUpdateSchema>;
export type ProntuarioCreateInput = z.infer<typeof ProntuarioCreateSchema>;
export type ExameCreateInput = z.infer<typeof ExameCreateSchema>;
