import { z } from 'zod';
import { EstadoFatura, TipoFatura, MetodoPagamento, EstadoSeguro } from '../enums';

export const ItemFaturaSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade: z.number().int().min(1).default(1),
  precoUnit: z.number().int().min(0),
  desconto: z.number().int().min(0).default(0),
});

export const FaturaCreateSchema = z.object({
  agendamentoId: z.string().optional(),
  pacienteId: z.string(),
  medicoId: z.string().optional(),
  tipo: z.nativeEnum(TipoFatura).default(TipoFatura.PARTICULAR),
  itens: z.array(ItemFaturaSchema).min(1, 'Pelo menos um item é obrigatório'),
  desconto: z.number().int().min(0).default(0),
  notas: z.string().optional(),
  dataVencimento: z.string().optional(),
});

export type FaturaCreateInput = z.infer<typeof FaturaCreateSchema>;

export const FaturaUpdateSchema = FaturaCreateSchema.partial().extend({
  estado: z.nativeEnum(EstadoFatura).optional(),
});

export const PagamentoCreateSchema = z.object({
  faturaId: z.string(),
  metodo: z.nativeEnum(MetodoPagamento),
  valor: z.number().int().min(1),
  referencia: z.string().optional(),
  notas: z.string().optional(),
  seguro: z.object({
    seguradora: z.string(),
    numeroBeneficiario: z.string(),
    numeroAutorizacao: z.string().optional(),
    valorSolicitado: z.number().int().min(1),
  }).optional(),
});

export type PagamentoCreateInput = z.infer<typeof PagamentoCreateSchema>;

export const SeguroUpdateSchema = z.object({
  estado: z.nativeEnum(EstadoSeguro),
  valorAprovado: z.number().int().optional(),
  numeroAutorizacao: z.string().optional(),
  notasSeguradora: z.string().optional(),
});

// DTOs
export interface ItemFaturaDTO {
  id: string;
  faturaId: string;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  total: number;
}

export interface SeguroPagamentoDTO {
  pagamentoId: string;
  seguradora: string;
  numeroBeneficiario: string;
  numeroAutorizacao?: string;
  valorSolicitado: number;
  valorAprovado: number;
  estado: EstadoSeguro;
  dataSubmissao?: string;
  dataResposta?: string;
  notasSeguradora?: string;
}

export interface PagamentoDTO {
  id: string;
  clinicaId: string;
  faturaId: string;
  metodo: MetodoPagamento;
  valor: number;
  referencia?: string;
  notas?: string;
  criadoEm: string;
  criadoPor: string;
  seguro?: SeguroPagamentoDTO;
}

export interface FaturaDTO {
  id: string;
  clinicaId: string;
  numeroFatura: string;
  agendamentoId?: string;
  pacienteId: string;
  medicoId?: string;
  tipo: TipoFatura;
  estado: EstadoFatura;
  subtotal: number;
  desconto: number;
  total: number;
  notas?: string;
  dataEmissao?: string;
  dataVencimento?: string;
  criadoEm: string;
  atualizadoEm: string;
  itens?: ItemFaturaDTO[];
  pagamentos?: PagamentoDTO[];
  paciente?: {
    id: string;
    nome: string;
    numeroPaciente?: string;
    endereco?: string;
  };
  medico?: {
    id: string;
    nome: string;
  };
}
