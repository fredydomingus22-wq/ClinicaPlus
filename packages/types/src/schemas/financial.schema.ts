import { z } from 'zod';
import { EstadoFatura, TipoFatura, MetodoPagamento, EstadoSeguro, TipoDocumentoFiscal } from '../enums';

export enum TipoItemFatura {
  PRODUTO = 'PRODUTO',
  TRATAMENTO = 'TRATAMENTO',
  EXAME = 'EXAME',
  CONSULTA = 'CONSULTA',
  SERVICO = 'SERVICO',
}

export const ItemFaturaSchema = z.object({
  tipoItem: z.nativeEnum(TipoItemFatura).default(TipoItemFatura.SERVICO),
  
  // Campos polimórficos
  produtoId: z.string().optional(),
  tratamentoId: z.string().optional(),
  exameId: z.string().optional(),
  medicoId: z.string().optional(),
  
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade: z.number().int().min(1).default(1),
  precoUnit: z.number().int().min(0),
  desconto: z.number().int().min(0).default(0),
  taxaIva: z.number().min(0).max(14).default(0),
  codigoIva: z.string().default('ISE'),
  motivoIsencao: z.string().optional(),
}).refine(data => {
  // Validação: pelo menos um ID deve corresponder ao tipoItem
  if (data.tipoItem === TipoItemFatura.PRODUTO && !data.produtoId) {
    return false;
  }
  if (data.tipoItem === TipoItemFatura.TRATAMENTO && !data.tratamentoId) {
    return false;
  }
  if (data.tipoItem === TipoItemFatura.EXAME && !data.exameId) {
    return false;
  }
  if (data.tipoItem === TipoItemFatura.CONSULTA && !data.medicoId) {
    return false;
  }
  // SERVICO não requer ID
  return true;
}, {
  message: "ID do item é obrigatório para o tipo selecionado",
});

export const ItemFacturavelSelectSchema = z.object({
  id: z.string(),
  tipo: z.nativeEnum(TipoItemFatura),
  nome: z.string(),
  codigo: z.string().nullable(),
  preco: z.number(),
  taxaIva: z.number(),
  codigoIva: z.string(),
  motivoIsencao: z.string().nullable(),
  estoqueAtual: z.number().optional(), // Apenas para PRODUTO
  gerenciaEstoque: z.boolean().optional(), // Apenas para PRODUTO
});

export type ItemFacturavelSelect = z.infer<typeof ItemFacturavelSelectSchema>;

export const FaturaCreateSchema = z.object({
  agendamentoId: z.string().optional(),
  pacienteId: z.string(),
  medicoId: z.string().optional(),
  tipo: z.nativeEnum(TipoFatura).default(TipoFatura.PARTICULAR),
  tipoDocFiscal: z.nativeEnum(TipoDocumentoFiscal).default(TipoDocumentoFiscal.FT),
  itens: z.array(ItemFaturaSchema).min(1, 'Pelo menos um item é obrigatório'),
  desconto: z.number().int().min(0).default(0),
  retencaoFonte: z.number().int().min(0).default(0),
  notas: z.string().optional(),
  dataEmissao: z.string().optional(), // Retrodatação
  retrodatar: z.boolean().default(false),
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

export const NotaDebitoCreateSchema = z.object({
  motivo: z.string().min(1, 'Motivo é obrigatório'),
  itens: z.array(ItemFaturaSchema).min(1, 'Pelo menos um item é obrigatório'),
});

export type NotaDebitoCreateInput = z.infer<typeof NotaDebitoCreateSchema>;

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
  tipoItem: TipoItemFatura;
  
  // Campos polimórficos
  produtoId?: string;
  tratamentoId?: string;
  exameId?: string;
  medicoId?: string;
  
  // Dados do item relacionado (opcional, para display)
  produto?: {
    id: string;
    nome: string;
    codigo: string | null;
  };
  tipoTratamento?: {
    id: string;
    nome: string;
  };
  tipoExame?: {
    id: string;
    nome: string;
  };
  medico?: {
    id: string;
    nome: string;
  };
  
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  taxaIva: number;
  codigoIva: string;
  motivoIsencao?: string;
  total: number;
}

export interface SeguroPagamentoDTO {
  pagamentoId: string;
  seguradora: string;
  numeroBeneficiario: string;
  numeroAutorizacao?: string;
  valorSolicitado: number;
  valorAprovado?: number | null;
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
  numeroRecibo?: string;
  fiscalHash?: string;
  documentoChave?: string;
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
  totalIva: number;
  total: number;
  notas?: string;
  dataEmissao?: string;
  dataVencimento?: string;
  criadoEm: string;
  atualizadoEm: string;
  // Campos Fiscais (AGT)
  tipoDocFiscal: TipoDocumentoFiscal;
  valorExtenso?: string | null;
  retencaoFonte: number;
  valorPago: number;
  moeda: string;
  fiscalHash?: string | null;
  hashAnterior?: string | null;
  hashControl?: string | null;
  documentoChave?: string | null;
  serieDocFiscal?: string | null;
  statusEnvio?: string;
  emContingencia?: boolean;
  agtRequestID?: string | null;
  itens?: ItemFaturaDTO[];
  pagamentos?: PagamentoDTO[];
  paciente?: {
    id: string;
    nome: string;
    numeroPaciente?: string;
    endereco?: string;
    nif?: string;
    cidade?: string;
  };
  medico?: {
    id: string;
    nome: string;
  };
}

export interface DocumentoFiscalDTO {
  id: string; // Pode ser faturaId ou pagamentoId
  numeroDocumento: string; // numeroFatura ou numeroRecibo
  tipoDocFiscal: TipoDocumentoFiscal;
  dataEmissao: string;
  total: number;
  estado: EstadoFatura | 'EMITIDO'; // Para faturas será o estado normal, recibos serão EMITIDO
  pacienteNome: string;
  pacienteNumero?: string;
  referenciaOrigem?: string; // Para recibos, o número da fatura associada. Para NC/ND, a fatura associada
  documentoOrigemId?: string;
}
