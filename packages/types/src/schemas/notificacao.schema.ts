import { z } from 'zod';

export const NotificacaoTipoSchema = z.enum([
  'INFO',
  'SUCESSO',
  'AVISO',
  'ERRO',
  'AGENDAMENTO',
  'RECEITA'
]);

export type NotificacaoTipo = z.infer<typeof NotificacaoTipoSchema>;

export const NotificacaoSchema = z.object({
  id: z.string().cuid(),
  utilizadorId: z.string().cuid(),
  titulo: z.string().min(1),
  mensagem: z.string().min(1),
  tipo: NotificacaoTipoSchema,
  lida: z.boolean(),
  url: z.string().optional(),
  criadoEm: z.date(),
});

export const NotificacaoCreateSchema = NotificacaoSchema.omit({
  id: true,
  lida: true,
  criadoEm: true,
});

export type Notificacao = z.infer<typeof NotificacaoSchema>;
export type NotificacaoCreate = z.infer<typeof NotificacaoCreateSchema>;
