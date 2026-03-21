import axios, { AxiosError } from 'axios';
import { config } from './config';
import { logger } from './logger';
import { AppError } from './AppError';
import { TEMPLATES } from './n8n-templates/index';
import type { WaTipoAutomacao } from '@prisma/client';

const n8n = axios.create({
  baseURL: config.N8N_BASE_URL,
  headers: { 
    'X-N8N-API-KEY': config.N8N_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 20_000,
});

// Interceptor: converter erros da n8n API em AppError (MODULE-whatsapp.md §5)
n8n.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    const msg = (err.response?.data as { message?: string })?.message ?? err.message;
    const url = err.config?.url;
    const method = err.config?.method;
    logger.error({ url, method, status: err.response?.status, msg }, 'Erro na API do n8n');
    throw new AppError(`n8n API: ${msg}`, 502, 'N8N_API_ERROR');
  }
);

/**
 * Variáveis passadas para os templates n8n.
 */
export interface TemplateVars {
  clinicaId:    string;
  clinicaSlug:  string;
  instanceName: string;
  apiBaseUrl:   string;
  apiKey:       string;  // API key interna gerada para o n8n
  automacaoId:  string;
  configuracao: Record<string, unknown>;
}

export const n8nApi = {
  /**
   * Cria um novo workflow usando o template correspondente ao tipo.
   * Resolve conflitos de webhook automaticamente desactivando workflows antigos.
   */
  async criarWorkflow(tipo: WaTipoAutomacao, vars: TemplateVars): Promise<{ workflowId: string; webhookPath: string }> {
    const templateFactory = TEMPLATES[tipo];
    if (!templateFactory) {
      throw new AppError(`Template não encontrado para o tipo: ${tipo}`, 400, 'N8N_TEMPLATE_NOT_FOUND');
    }
    const template = templateFactory(vars) as Record<string, any>;
    const webhookPath = extrairWebhookPath(template);

    // Resolver conflitos de webhook (n8n não permite 2 ativos no mesmo path)
    if (webhookPath) {
      try {
        const workflows = await this.listarWorkflows();
        const conflitos = workflows.filter(w => 
          w.active && extrairWebhookPath(w as Record<string, any>) === webhookPath
        );

        for (const w of conflitos) {
          logger.info({ workflowId: w.id, webhookPath }, 'Desactivando workflow conflituante no n8n');
          await this.desactivar(w.id).catch(() => {});
        }
      } catch (err) {
        logger.warn({ err }, 'Falha ao verificar conflitos de webhook no n8n. A continuar...');
      }
    }

    const { data } = await n8n.post('/api/v1/workflows', template);
    const workflowId = data.id as string;

    // Activação
    try {
      await n8n.post(`/api/v1/workflows/${workflowId}/activate`);
    } catch (err: unknown) {
      logger.warn({ err, workflowId }, 'Workflow criado mas activação falhou no n8n.');
    }

    return { workflowId, webhookPath };
  },

  /**
   * Lista todos os workflows do n8n.
   */
  async listarWorkflows(): Promise<Array<{ id: string; active: boolean; nodes: any[] }>> {
    const { data } = await n8n.get('/api/v1/workflows');
    return (data.data || []) as Array<{ id: string; active: boolean; nodes: any[] }>;
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

  /** Obter detalhes de um workflow (MODULE-whatsapp.md §5) */
  async detalhes(workflowId: string): Promise<unknown> {
    const { data } = await n8n.get(`/api/v1/workflows/${workflowId}`);
    return data;
  },
};

function extrairWebhookPath(workflowData: Record<string, unknown>): string {
  const nodes = (workflowData.nodes as { type: string; parameters?: { path?: string } }[]) ?? [];
  const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  return webhookNode?.parameters?.path ?? '';
}
