import axios from 'axios';
import { config } from './config';
import { TEMPLATES } from './n8n-templates/index';
// Remover a importação directa do Prisma aqui se não for preciso; importamos WaTipoAutomacao do types/prisma ou só usamos type.
import type { WaTipoAutomacao } from '@prisma/client';

const n8n = axios.create({
  baseURL: config.N8N_BASE_URL,
  headers: { 'X-N8N-API-KEY': config.N8N_API_KEY },
  timeout: 20_000,
});

/**
 * Variáveis passadas para os templates n8n.
 */
export interface TemplateVars {
  clinicaId:    string;
  clinicaSlug:  string;
  instanceName: string;
  apiBaseUrl:   string;
  apiKey:       string;  // API key interna gerada para o n8n
  configuracao: Record<string, unknown>;
}

export const n8nApi = {
  /**
   * Cria um novo workflow usando o template correspondente ao tipo.
   */
  async criarWorkflow(tipo: WaTipoAutomacao, vars: TemplateVars): Promise<{ workflowId: string; webhookPath: string }> {
    const templateFactory = TEMPLATES[tipo];
    if (!templateFactory) {
      throw new Error(`Template não encontrado para o tipo: ${tipo}`);
    }
    const template = templateFactory(vars);
    const { data } = await n8n.post('/api/v1/workflows', template);
    await n8n.post(`/api/v1/workflows/${data.id}/activate`);
    const webhookPath = extrairWebhookPath(data);
    return { workflowId: data.id as string, webhookPath };
  },

  /**
   * Activa um workflow pelo ID.
   */
  async activar(workflowId: string): Promise<void> {
    await n8n.post(`/api/v1/workflows/${workflowId}/activate`);
  },

  /**
   * Desactiva um workflow pelo ID.
   */
  async desactivar(workflowId: string): Promise<void> {
    await n8n.post(`/api/v1/workflows/${workflowId}/deactivate`);
  },

  /**
   * Elimina um workflow pelo ID.
   */
  async eliminar(workflowId: string): Promise<void> {
    await n8n.delete(`/api/v1/workflows/${workflowId}`);
  },
};

function extrairWebhookPath(workflowData: Record<string, unknown>): string {
  const nodes = (workflowData.nodes as { type: string; parameters?: { path?: string } }[]) ?? [];
  const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  return webhookNode?.parameters?.path ?? '';
}
