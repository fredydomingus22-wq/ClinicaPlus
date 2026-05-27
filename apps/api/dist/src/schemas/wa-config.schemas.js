"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configBoasVindasSchema = exports.configConfirmacaoSchema = exports.configLembreteSchema = exports.configMarcacaoSchema = void 0;
const zod_1 = require("zod");
/**
 * Schemas Zod para validação das configurações de automações WhatsApp.
 * Source of truth: MODULE-whatsapp.md §3.
 */
/** Configuração da automação MARCACAO_CONSULTA */
exports.configMarcacaoSchema = zod_1.z.object({
    horarioInicio: zod_1.z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
    horarioFim: zod_1.z.string().regex(/^\d{2}:\d{2}$/).default('18:00'),
    diasAtivos: zod_1.z.array(zod_1.z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
    msgBoasVindas: zod_1.z.string().optional(),
    msgForaHorario: zod_1.z.string().optional(),
    msgErroGenerico: zod_1.z.string().optional(),
});
/** Configuração das automações LEMBRETE_24H e LEMBRETE_2H */
exports.configLembreteSchema = zod_1.z.object({
    template: zod_1.z.string().default('Olá {nome}! Lembrete da consulta {data} às {hora}.'),
});
/** Configuração da automação CONFIRMACAO_CANCELAMENTO */
exports.configConfirmacaoSchema = zod_1.z.object({
    msgConfirmado: zod_1.z.string().optional(),
    msgCancelado: zod_1.z.string().optional(),
    msgInvalido: zod_1.z.string().optional(),
});
/** Configuração da automação BOAS_VINDAS */
exports.configBoasVindasSchema = zod_1.z.object({
    mensagem: zod_1.z.string().optional(),
});
