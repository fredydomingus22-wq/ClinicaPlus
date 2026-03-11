import { z } from 'zod';
import { Plano } from '../enums';

export const SubscricaoSchema = z.object({
  id: z.string(),
  clinicaId: z.string(),
  plano: z.nativeEnum(Plano),
  status: z.enum(['ATIVO', 'CANCELADO', 'EXPIRADO', 'PENDENTE']),
  dataInicio: z.string(),
  dataFim: z.string(),
  proximoFaturamento: z.string(),
  canceladoEm: z.string().nullable().optional(),
});

export type SubscricaoDTO = z.infer<typeof SubscricaoSchema>;

export const FaturaSchema = z.object({
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

export type FaturaDTO = z.infer<typeof FaturaSchema>;

export const BillingHistorySchema = z.array(FaturaSchema);

export const SubscriptionStatusSchema = z.object({
  plano: z.nativeEnum(Plano),
  status: z.string(),
  proximaFatura: z.string(),
  diasRestantes: z.number(),
});

export type SubscriptionStatusDTO = z.infer<typeof SubscriptionStatusSchema>;
