import { z } from 'zod';

export const ContactoClinicaSchema = z.object({
  tipo: z.enum(['TELEFONE', 'WHATSAPP', 'EMAIL', 'OUTRO']),
  valor: z.string().min(1, 'Valor é obrigatório'),
  descricao: z.string().max(50).optional(),
  ordem: z.number().int().default(0),
});

export const ContactoClinicaCreateSchema = ContactoClinicaSchema;
export const ContactoClinicaUpdateSchema = ContactoClinicaSchema.partial();

export type ContactoClinicaInput = z.infer<typeof ContactoClinicaSchema>;

export const ClinicaCreateSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  slug: z.string().min(3, 'Slug deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  adminNome: z.string().min(3, 'Nome do administrador é obrigatório'),
  adminEmail: z.string().email('Email do administrador inválido'),
  adminPassword: z.string().min(8, 'Palavra-passe deve ter pelo menos 8 caracteres'),
  plano: z.enum(['BASICO', 'PRO', 'ENTERPRISE']).default('BASICO'),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  provincia: z.string().optional(),
  logo: z.string().url('URL de logo inválida').optional().or(z.literal('')),
});

export type ClinicaCreateInput = z.infer<typeof ClinicaCreateSchema>;

export const ConfiguracaoClinicaUpdateSchema = z.object({
  lembrete24h: z.boolean().optional(),
  lembrete2h: z.boolean().optional(),
  agendamentoOnline: z.boolean().optional(),
  preTriagem: z.boolean().optional(),
  prontuarioCustom: z.boolean().optional(),
  horasAntecedencia: z.number().int().min(1).optional(),
  moedaSimbolo: z.string().max(5).optional(),
  fusoHorario: z.string().optional(),
});

export const ClinicaUpdateSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  provincia: z.string().optional(),
  logo: z.string().url('URL de logo inválida').optional().or(z.literal('')),
  configuracao: ConfiguracaoClinicaUpdateSchema.optional(),
});

export type ClinicaUpdateInput = z.infer<typeof ClinicaUpdateSchema>;

export const ClinicaListQuerySchema = z.object({
  q: z.string().optional(),
  plano: z.string().optional(),
  ativo: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type ClinicaListQuery = z.infer<typeof ClinicaListQuerySchema>;
