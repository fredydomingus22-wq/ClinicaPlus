import { z } from 'zod';
import { Plano, EstadoSubscricao, RazaoMudancaPlano } from '../enums';

export const SubscricaoSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  plano: z.nativeEnum(Plano),
  estado: z.nativeEnum(EstadoSubscricao),
  inicioEm: z.string(),
  validaAte: z.string(),
  trialAte: z.string().nullable().optional(),
  valorKz: z.number().int().nullable().optional(),
  referenciaInterna: z.string().nullable().optional(),
  razao: z.nativeEnum(RazaoMudancaPlano),
  planoAnterior: z.nativeEnum(Plano).nullable().optional(),
  alteradoPor: z.string(),
  notas: z.string().nullable().optional(),
  criadoEm: z.string(),
});

export type SubscricaoDTO = z.infer<typeof SubscricaoSchema>;

export const FaturaAssinaturaSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  numero: z.string(),
  valor: z.number().int(),
  moeda: z.string(),
  status: z.enum(['PAGO', 'PENDENTE', 'CANCELADO', 'VENCIDO']),
  dataEmissao: z.string(),
  dataPagamento: z.string().nullable().optional(),
  dataVencimento: z.string(),
  urlPdf: z.string().nullable().optional(),
});

export type FaturaAssinaturaDTO = z.infer<typeof FaturaAssinaturaSchema>;

export const BillingHistorySchema = z.array(FaturaAssinaturaSchema);

export const SubscriptionStatusSchema = z.object({
  plano: z.nativeEnum(Plano),
  status: z.string(),
  proximaFatura: z.string(),
  diasRestantes: z.number(),
});

export type SubscriptionStatusDTO = z.infer<typeof SubscriptionStatusSchema>;
