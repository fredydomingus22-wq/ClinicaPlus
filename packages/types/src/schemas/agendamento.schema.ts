import { z } from 'zod';
import { EstadoAgendamentoSchema, TipoAgendamentoSchema, TipoAgendamento } from '../enums';

export const TriagemSchema = z.object({
  pa: z.string().regex(/^\d{2,3}\/\d{2,3}$/).optional(),
  temperatura: z.number().min(30).max(45).optional(),
  peso: z.number().min(0.5).max(500).optional(),
  altura: z.number().min(30).max(250).optional(),
  imc: z.number().optional(),
  frequenciaCardiaca: z.number().int().min(20).max(300).optional(),
  sintomas: z.array(z.string().trim()).optional(),
  urgencia: z.enum(['NORMAL', 'URGENTE', 'MUITO_URGENTE']).default('NORMAL'),
});

export const AgendamentoCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  dataHora: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data e hora inválidas",
  }),
  duracao: z.number().int().min(10).max(120).optional(),
  tipo: TipoAgendamentoSchema.default(TipoAgendamento.CONSULTA),
  estado: EstadoAgendamentoSchema.optional(),
  motivoConsulta: z.string().max(500).trim().optional(),
  observacoes: z.string().max(1000).trim().optional(),
});

export const AgendamentoUpdateEstadoSchema = z.object({
  estado: EstadoAgendamentoSchema,
  motivo: z.string().max(500).trim().optional(),
});

export const AgendamentoTriagemSchema = TriagemSchema.extend({
  urgencia: z.enum(['NORMAL', 'URGENTE', 'MUITO_URGENTE'])
});

export const AgendamentoConsultaSchema = z.object({
  notasConsulta: z.string().max(5000).trim().optional(),
  diagnostico: z.string().max(1000).trim().optional(),
  finalizar: z.boolean().optional(),
});

export const AgendamentoListQuerySchema = z.object({
  medicoId: z.string().optional(),
  pacienteId: z.string().optional(),
  estado: EstadoAgendamentoSchema.optional(),
  tipo: TipoAgendamentoSchema.optional(),
  dataInicio: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida" }).optional(),
  dataFim: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida" }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AgendamentoCreateInput = z.infer<typeof AgendamentoCreateSchema>;
export type AgendamentoUpdateEstadoInput = z.infer<typeof AgendamentoUpdateEstadoSchema>;
export type TriagemInput = z.infer<typeof AgendamentoTriagemSchema>;
export type ConsultaInput = z.infer<typeof AgendamentoConsultaSchema>;
export type AgendamentoListQuery = z.infer<typeof AgendamentoListQuerySchema>;
export type Triagem = z.infer<typeof TriagemSchema>;
