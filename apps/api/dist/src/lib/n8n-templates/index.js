"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES = void 0;
const marcacao_template_1 = require("./marcacao.template");
const lembrete_24h_template_1 = require("./lembrete-24h.template");
const lembrete_2h_template_1 = require("./lembrete-2h.template");
const confirmacao_template_1 = require("./confirmacao.template");
const boas_vindas_template_1 = require("./boas-vindas.template");
/**
 * Registo central de todos os templates de workflow do n8n.
 */
exports.TEMPLATES = {
    MARCACAO_CONSULTA: marcacao_template_1.templateMarcacao,
    LEMBRETE_24H: lembrete_24h_template_1.templateLembrete24h,
    LEMBRETE_2H: lembrete_2h_template_1.templateLembrete2h,
    CONFIRMACAO_CANCELAMENTO: confirmacao_template_1.templateConfirmacao,
    BOAS_VINDAS: boas_vindas_template_1.templateBoasVindas,
    BEM_VINDO: boas_vindas_template_1.templateBoasVindas,
    LEMBRETE: lembrete_24h_template_1.templateLembrete24h,
    FAQ: boas_vindas_template_1.templateBoasVindas,
    IA_ASSISTANT: () => ({}),
};
