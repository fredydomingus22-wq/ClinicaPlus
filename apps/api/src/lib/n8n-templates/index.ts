import { WaTipoAutomacao } from '@clinicaplus/types';
import { TemplateVars } from '../n8nApi';
import { templateMarcacao } from './marcacao.template';
import { templateLembrete24h } from './lembrete-24h.template';
import { templateLembrete2h } from './lembrete-2h.template';
import { templateConfirmacao } from './confirmacao.template';
import { templateBoasVindas } from './boas-vindas.template';

/**
 * Registo central de todos os templates de workflow do n8n.
 */
export const TEMPLATES: Partial<Record<WaTipoAutomacao, (vars: TemplateVars) => object>> = {
  MARCACAO_CONSULTA: templateMarcacao,
  LEMBRETE_24H: templateLembrete24h,
  LEMBRETE_2H: templateLembrete2h,
  CONFIRMACAO_CANCELAMENTO: templateConfirmacao,
  BOAS_VINDAS: templateBoasVindas,
  BEM_VINDO: templateBoasVindas,
  LEMBRETE: templateLembrete24h,
  FAQ: templateBoasVindas,
};
