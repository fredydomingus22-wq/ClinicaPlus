import { z } from 'zod';

// ─── EXAME
export const EstadoExameSchema = z.enum(['PENDENTE', 'AGENDADO', 'REALIZADO', 'LAUDADO', 'CANCELADO']);
export type EstadoExame = z.infer<typeof EstadoExameSchema>;

export const CriarExameSchema = z.object({
  pacienteId:    z.string().cuid(),
  medicoId:      z.string().cuid(),
  agendamentoId: z.string().cuid().optional(),
  tipoExameId:   z.string().cuid().optional(), // Usa catálogo novo, mas ainda é opcional perante legados.
  descricao:     z.string().max(500).optional(),
});
export type CriarExameDto = z.infer<typeof CriarExameSchema>;

export const AtualizarExameSchema = z.object({
  estado:        EstadoExameSchema.optional(),
  dataRealizacao: z.coerce.date().optional(),
  laudoNota:     z.string().max(2000).optional(),
});
export type AtualizarExameDto = z.infer<typeof AtualizarExameSchema>;

// ─── PLANO
export const EstadoPlanoSchema = z.enum(['ACTIVO', 'SUSPENSO', 'CONCLUIDO', 'CANCELADO']);
export type EstadoPlano = z.infer<typeof EstadoPlanoSchema>;

export const CriarPlanoSchema = z.object({
  pacienteId:       z.string().cuid(),
  agendamentoOrigemId: z.string().cuid().optional(),
  medicoId:         z.string().cuid(),
  responsavelId:    z.string().cuid().optional(),
  tipoId:           z.string().cuid(), // OBRIGATÓRIO (Link Catálogo TipoTratamento)
  descricao:        z.string().max(500).optional(),
  totalSessoes:     z.number().int().min(1).max(500),
  frequenciaSemana: z.number().int().min(1).max(7),
  dataInicio:       z.coerce.date(),
  duracaoSessaoMin: z.number().int().min(15).max(480),
  observacoes:      z.string().max(1000).optional(),
});
export type CriarPlanoDto = z.infer<typeof CriarPlanoSchema>;

export const AtualizarPlanoSchema = z.object({
  estado:         EstadoPlanoSchema.optional(),
  observacoes:    z.string().max(1000).optional(),
  dataFimReal:    z.coerce.date().optional(),
});
export type AtualizarPlanoDto = z.infer<typeof AtualizarPlanoSchema>;

// ─── SESSOES
export const EstadoSessaoSchema = z.enum(['AGENDADO', 'REALIZADO', 'FALTOU', 'CANCELADO']);
export type EstadoSessao = z.infer<typeof EstadoSessaoSchema>;

export const AtualizarSessaoSchema = z.object({
  estado: EstadoSessaoSchema,
  notas: z.string().max(2000).optional()
});
export type AtualizarSessaoDto = z.infer<typeof AtualizarSessaoSchema>;

// ─── CATALOGOS (Leitura base)
export const TipoExameClinicaSchema = z.object({
  id: z.string().cuid(),
  clinicaId: z.string(),
  nome: z.string(),
  descricao: z.string().nullable().optional(),
  preco: z.number().int(),
  ativo: z.boolean()
});
export type TipoExameClinicaDTO = z.infer<typeof TipoExameClinicaSchema>;

export const TipoTratamentoSchema = z.object({
  id: z.string().cuid(),
  clinicaId: z.string(),
  nome: z.string(),
  descricao: z.string().nullable().optional(),
  duracaoMin: z.number().nullable().optional(),
  preco: z.number().int(),
  ativo: z.boolean()
});
export type TipoTratamentoDTO = z.infer<typeof TipoTratamentoSchema>;

export const PlanoTratamentoSchema = z.object({
  id: z.string().cuid(),
  clinicaId: z.string(),
  pacienteId: z.string(),
  medicoId: z.string(),
  tipoId: z.string(),
  totalSessoes: z.number().int(),
  frequenciaSemana: z.number().int(),
  sessoesRealizadas: z.number().int().optional().default(0),
  dataInicio: z.string(),
  dataFimPrevista: z.string(),
  dataFimReal: z.string().nullable().optional(),
  estado: z.string(),
  descricao: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  agendamentoOrigemId: z.string().nullable().optional(),
  responsavelId: z.string().nullable().optional(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
  tipoTratamento: TipoTratamentoSchema.optional(),
  paciente: z.any().optional(),
  _count: z.object({ sessoes: z.number() }).optional(),
});
export type PlanoTratamentoDTO = z.infer<typeof PlanoTratamentoSchema>;

export const CriarTipoExameClinicaSchema = z.object({
  nome: z.string().min(1).max(100),
  descricao: z.string().max(500).optional(),
  preco: z.number().int().min(0).optional().default(0),
  ativo: z.boolean().optional().default(true),
});
export type CriarTipoExameClinicaDto = z.infer<typeof CriarTipoExameClinicaSchema>;

export const CriarTipoTratamentoSchema = z.object({
  nome: z.string().min(1).max(100),
  descricao: z.string().max(500).optional(),
  duracaoMin: z.number().int().min(1).optional(),
  preco: z.number().int().min(0).optional().default(0),
  ativo: z.boolean().optional().default(true),
});
export type CriarTipoTratamentoDto = z.infer<typeof CriarTipoTratamentoSchema>;
