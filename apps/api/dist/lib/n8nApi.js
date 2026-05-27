"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.n8nApi = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const logger_1 = require("./logger");
const AppError_1 = require("./AppError");
const index_1 = require("./n8n-templates/index");
const n8n = axios_1.default.create({
    baseURL: config_1.config.N8N_BASE_URL,
    headers: {
        'X-N8N-API-KEY': config_1.config.N8N_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 20000,
});
// Interceptor: converter erros da n8n API em AppError (MODULE-whatsapp.md §5)
n8n.interceptors.response.use(res => res, (err) => {
    const msg = err.response?.data?.message ?? err.message;
    const url = err.config?.url;
    const method = err.config?.method;
    logger_1.logger.error({ url, method, status: err.response?.status, msg }, 'Erro na API do n8n');
    throw new AppError_1.AppError(`n8n API: ${msg}`, 502, 'N8N_API_ERROR');
});
exports.n8nApi = {
    /**
     * Cria um novo workflow usando o template correspondente ao tipo.
     * Resolve conflitos de webhook automaticamente desactivando workflows antigos.
     */
    async criarWorkflow(tipo, vars) {
        const templateFactory = index_1.TEMPLATES[tipo];
        if (!templateFactory) {
            throw new AppError_1.AppError(`Template não encontrado para o tipo: ${tipo}`, 400, 'N8N_TEMPLATE_NOT_FOUND');
        }
        const template = templateFactory(vars);
        const webhookPath = extrairWebhookPath(template);
        // Resolver conflitos de webhook (n8n não permite 2 ativos no mesmo path)
        if (webhookPath) {
            try {
                const workflows = await this.listarWorkflows();
                const conflitos = workflows.filter(w => w.active && extrairWebhookPath(w) === webhookPath);
                for (const w of conflitos) {
                    logger_1.logger.info({ workflowId: w.id, webhookPath }, 'Desactivando workflow conflituante no n8n');
                    await this.desactivar(w.id).catch(() => { });
                }
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Falha ao verificar conflitos de webhook no n8n. A continuar...');
            }
        }
        const { data } = await n8n.post('/api/v1/workflows', template);
        const workflowId = data.id;
        // Activação
        try {
            await n8n.post(`/api/v1/workflows/${workflowId}/activate`);
        }
        catch (err) {
            logger_1.logger.warn({ err, workflowId }, 'Workflow criado mas activação falhou no n8n.');
        }
        return { workflowId, webhookPath };
    },
    /**
     * Lista todos os workflows do n8n.
     */
    async listarWorkflows() {
        const { data } = await n8n.get('/api/v1/workflows');
        return (data.data || []);
    },
    /**
     * Activa um workflow pelo ID.
     */
    async activar(workflowId) {
        await n8n.post(`/api/v1/workflows/${workflowId}/activate`);
    },
    /**
     * Desactiva um workflow pelo ID.
     */
    async desactivar(workflowId) {
        await n8n.post(`/api/v1/workflows/${workflowId}/deactivate`);
    },
    /**
     * Elimina um workflow pelo ID.
     */
    async eliminar(workflowId) {
        await n8n.delete(`/api/v1/workflows/${workflowId}`);
    },
    /** Obter detalhes de um workflow (MODULE-whatsapp.md §5) */
    async detalhes(workflowId) {
        const { data } = await n8n.get(`/api/v1/workflows/${workflowId}`);
        return data;
    },
};
function extrairWebhookPath(workflowData) {
    const nodes = workflowData.nodes ?? [];
    const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    return webhookNode?.parameters?.path ?? '';
}
