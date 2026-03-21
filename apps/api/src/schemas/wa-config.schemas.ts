import { z } from 'zod';

/**
 * Schemas Zod para validação das configurações de automações WhatsApp.
 * Source of truth: MODULE-whatsapp.md §3.
 */

/** Configuração da automação MARCACAO_CONSULTA */
export const configMarcacaoSchema = z.object({
  horarioInicio:   z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
  horarioFim:      z.string().regex(/^\d{2}:\d{2}$/).default('18:00'),
  diasAtivos:      z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
  msgBoasVindas:   z.string().optional(),
  msgForaHorario:  z.string().optional(),
  msgErroGenerico: z.string().optional(),
});

/** Configuração das automações LEMBRETE_24H e LEMBRETE_2H */
export const configLembreteSchema = z.object({
  template: z.string().default('Olá {nome}! Lembrete da consulta {data} às {hora}.'),
});

/** Configuração da automação CONFIRMACAO_CANCELAMENTO */
export const configConfirmacaoSchema = z.object({
  msgConfirmado: z.string().optional(),
  msgCancelado:  z.string().optional(),
  msgInvalido:   z.string().optional(),
});

/** Configuração da automação BOAS_VINDAS */
export const configBoasVindasSchema = z.object({
  mensagem: z.string().optional(),
});

export type ConfigMarcacao = z.infer<typeof configMarcacaoSchema>;
export type ConfigLembrete = z.infer<typeof configLembreteSchema>;
export type ConfigConfirmacao = z.infer<typeof configConfirmacaoSchema>;
export type ConfigBoasVindas = z.infer<typeof configBoasVindasSchema>;
