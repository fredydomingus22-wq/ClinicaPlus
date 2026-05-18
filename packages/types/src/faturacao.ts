import { z } from "zod";
import { 
  EstadoFaturaSchema, 
  MetodoPagamentoSchema, 
  RegimeFiscalSchema, 
  TipoDocumentoFiscalSchema 
} from "./enums";

// Tipos locais para uso nos DTOs
import type { 
  EstadoFatura, 
  MetodoPagamento, 
  RegimeFiscal, 
  TipoDocumentoFiscal as TipoDocFiscal 
} from "./enums";

// ─── ITEM DE FATURA
export const ItemFaturaInputSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").max(500),
  quantidade: z.number().int().min(1, "Quantidade mínima é 1").max(9999),
  precoUnit: z.number().int().min(0, "Preço não pode ser negativo"), // Valor em Kwanza (Inteiro)
  desconto: z.number().int().min(0).default(0),
  taxaIva: z.number().min(0).max(100).optional(), // Override se necessário
  codigoIva: z.string().max(10).optional(),
  motivoIsencao: z.string().max(200).optional(),
});

// ─── CRIAR FATURA (RASCUNHO)
export const CriarFaturaSchema = z.object({
  pacienteId: z.string().min(1, "Paciente é obrigatório"),
  agendamentoId: z.string().optional(),
  medicoId: z.string().optional(),
  tipo: z.enum(["PARTICULAR", "SEGURO"]).default("PARTICULAR"),
  notas: z.string().max(1000).optional(),
  itens: z.array(ItemFaturaInputSchema).min(1, "Mínimo 1 item obrigatório"),
});
export type CriarFaturaDto = z.infer<typeof CriarFaturaSchema>;

// ─── REGISTAR PAGAMENTO
export const CriarPagamentoSchema = z.object({
  metodo: MetodoPagamentoSchema,
  valor: z.number().int().min(1, "Valor deve ser superior a zero"), // Kwanza
  referencia: z.string().max(100).optional(),
  notas: z.string().max(500).optional(),
});
export type CriarPagamentoDto = z.infer<typeof CriarPagamentoSchema>;

// ─── CRIAR NOTA DE CRÉDITO
export const CriarNotaCreditoSchema = z.object({
  motivo: z.string().min(5, "Descreva o motivo da anulação (mín. 5 carateres)").max(500),
  itens: z.array(ItemFaturaInputSchema).optional(), // Se omitido, anula totalmente
});
export type CriarNotaCreditoDto = z.infer<typeof CriarNotaCreditoSchema>;

// ─── CONFIGURAÇÃO FISCAL DA CLÍNICA
export const ConfiguracaoFiscalSchema = z.object({
  nif: z.string().length(9, "NIF deve ter exactamente 9 dígitos"),
  razaoSocial: z.string().min(3, "Razão Social muito curta").max(200),
  enderecoPostal: z.string().min(5, "Endereço deve ser completo").max(500),
  cidade: z.string().min(2).max(100).optional(),
  provincia: z.string().min(2).max(100).optional(),
  regimeFiscal: RegimeFiscalSchema,
  serieDocFiscal: z.string().min(2).max(10).default("CPLS"),
  agtSoftwareCert: z.string().max(100).optional(),
  agtApiToken: z.string().max(500).optional(),
});
export type ConfiguracaoFiscalDto = z.infer<typeof ConfiguracaoFiscalSchema>;

// ─── PARÂMETROS DE EXPORTAÇÃO SAF-T
export const SaftExportSchema = z.object({
  ano: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});
export type SaftExportDto = z.infer<typeof SaftExportSchema>;
