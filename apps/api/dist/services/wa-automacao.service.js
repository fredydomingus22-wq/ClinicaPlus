"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.waAutomacaoService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const n8nApi_1 = require("../lib/n8nApi");
const AppError_1 = require("../lib/AppError");
const apikeys_service_1 = require("./apikeys.service");
const auditLog_service_1 = require("./auditLog.service");
const config_1 = require("../lib/config");
const logger_1 = require("../lib/logger");
const index_1 = require("../lib/n8n-templates/index");
/**
 * Mapeia um modelo WaAutomacao do Prisma para WaAutomacaoDTO.
 */
function toWaAutomacaoDTO(a) {
    return {
        id: a.id,
        clinicaId: a.clinicaId,
        waInstanciaId: a.instanciaId, // Mapeamento crucial aqui
        tipo: a.tipo,
        ativo: a.ativo,
        configuracao: a.configuracao,
        n8nWorkflowId: a.n8nWorkflowId,
        n8nWebhookUrl: a.n8nWebhookUrl,
        criadoEm: a.criadoEm.toISOString(),
        atualizadoEm: a.atualizadoEm.toISOString(),
    };
}
/**
 * Serviço para gestão de automações do WhatsApp.
 */
exports.waAutomacaoService = {
    async activar(automacaoId, clinicaId, userId) {
        const automacao = await prisma_1.prisma.waAutomacao.findFirstOrThrow({
            where: { id: automacaoId, clinicaId },
            include: { instancia: true },
        });
        if (!automacao.instancia || automacao.instancia.estado !== 'CONECTADO') {
            throw new AppError_1.AppError('Liga o WhatsApp desta instância antes de activar a automação.', 400, 'WA_INSTANCIA_DESCONECTADA');
        }
        // Se ainda não tem workflowId (foi adicionado mas n8n falhou na altura), criamos agora
        // EXCEPÇÃO: IA_ASSISTANT não usa n8n
        if (!automacao.n8nWorkflowId && automacao.tipo !== client_1.WaTipoAutomacao.IA_ASSISTANT) {
            try {
                await this.provisionarWorkflow(automacao.id, clinicaId);
                // Recarregar objecto com o novo ID
                const updated = await prisma_1.prisma.waAutomacao.findUnique({ where: { id: automacaoId } });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (updated)
                    automacao.n8nWorkflowId = updated.n8nWorkflowId;
            }
            catch (err) {
                const error = err;
                logger_1.logger.error({ err: error.message, stack: error.stack, automacaoId }, 'Falha automática de provisionamento ao activar');
                throw new AppError_1.AppError(`Não foi possível criar o workflow no n8n: ${error.message}`, 500);
            }
        }
        try {
            if (automacao.n8nWorkflowId && automacao.tipo !== client_1.WaTipoAutomacao.IA_ASSISTANT) {
                logger_1.logger.info({
                    workflowId: automacao.n8nWorkflowId,
                    n8nBaseUrl: config_1.config.N8N_BASE_URL
                }, 'A activar workflow no n8n');
                await n8nApi_1.n8nApi.activar(automacao.n8nWorkflowId);
            }
        }
        catch (error) {
            const err = error;
            const status = err.statusCode || err.response?.status || 502;
            const message = err.message || 'Falha na comunicação com o n8n';
            logger_1.logger.error({
                err: error,
                automacaoId,
                workflowId: automacao.n8nWorkflowId,
                n8nBaseUrl: config_1.config.N8N_BASE_URL
            }, 'Erro ao activar workflow no n8n');
            throw new AppError_1.AppError(`N8N Error: ${message}`, status, 'N8N_ACTIVATION_ERROR', { workflowId: automacao.n8nWorkflowId });
        }
        await prisma_1.prisma.waAutomacao.update({
            where: { id: automacaoId },
            data: { ativo: true },
        });
        await auditLog_service_1.auditLogService.log({
            actorId: userId,
            clinicaId,
            accao: 'UPDATE',
            recurso: 'wa_automacao',
            recursoId: automacaoId,
            depois: { ativo: true },
        });
    },
    async desactivar(automacaoId, clinicaId, userId) {
        const automacao = await prisma_1.prisma.waAutomacao.findFirstOrThrow({
            where: { id: automacaoId, clinicaId },
        });
        if (automacao.n8nWorkflowId) {
            try {
                await n8nApi_1.n8nApi.desactivar(automacao.n8nWorkflowId);
            }
            catch {
                // Ignorar
            }
        }
        await prisma_1.prisma.waAutomacao.update({
            where: { id: automacaoId },
            data: { ativo: false },
        });
        await auditLog_service_1.auditLogService.log({
            actorId: userId,
            clinicaId,
            accao: 'UPDATE',
            recurso: 'wa_automacao',
            recursoId: automacaoId,
            depois: { ativo: false }
        });
    },
    /**
     * Provisiona o workflow no n8n para uma automação
     */
    async provisionarWorkflow(automacaoId, clinicaId) {
        const automacao = await prisma_1.prisma.waAutomacao.findUniqueOrThrow({
            where: { id: automacaoId },
            include: { instancia: true }
        });
        if (!automacao.instancia) {
            throw new AppError_1.AppError('Instância não vinculada à automação.', 400);
        }
        const apiKey = await apikeys_service_1.apiKeysService.getOrCreateInternal(clinicaId, `n8n-${automacao.tipo.toLowerCase()}`);
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
            where: { id: clinicaId },
            select: { slug: true }
        });
        if (automacao.tipo === client_1.WaTipoAutomacao.IA_ASSISTANT) {
            return; // Skip n8n for AI Assistant
        }
        if (automacao.n8nWorkflowId) {
            await n8nApi_1.n8nApi.eliminar(automacao.n8nWorkflowId).catch(err => {
                logger_1.logger.warn({ err, workflowId: automacao.n8nWorkflowId }, 'Falha ao eliminar workflow antigo ao re-provisionar');
            });
        }
        const vars = {
            clinicaId,
            clinicaSlug: clinica.slug,
            instanceName: automacao.instancia.evolutionName,
            apiBaseUrl: config_1.config.API_PUBLIC_URL || config_1.config.FRONTEND_URL.replace(':5173', ':3001'),
            apiKey: apiKey.tokenPlain,
            automacaoId: automacao.id,
            configuracao: automacao.configuracao || {},
        };
        const { workflowId, webhookPath } = await n8nApi_1.n8nApi.criarWorkflow(automacao.tipo, vars);
        await prisma_1.prisma.waAutomacao.update({
            where: { id: automacaoId },
            data: {
                n8nWorkflowId: workflowId,
                n8nWebhookPath: webhookPath,
                n8nWebhookUrl: `${config_1.config.N8N_BASE_URL}/webhook/${webhookPath}`
            },
        });
    },
    async listar(clinicaId, instanciaId) {
        const automacoes = await prisma_1.prisma.waAutomacao.findMany({
            where: {
                clinicaId,
                ...(instanciaId && { instanciaId })
            },
            orderBy: { tipo: 'asc' },
        });
        return automacoes.map(toWaAutomacaoDTO);
    },
    async configurar(automacaoId, configuracao, clinicaId) {
        const automacao = await prisma_1.prisma.waAutomacao.update({
            where: { id: automacaoId, clinicaId },
            data: {
                configuracao,
                atualizadoEm: new Date()
            },
        });
        await auditLog_service_1.auditLogService.log({
            actorId: 'sistema',
            clinicaId,
            accao: 'UPDATE',
            recurso: 'wa_automacao',
            recursoId: automacaoId,
            depois: { configuracao }
        });
        // Se configurou algo novo, re-provisionamos no n8n para actualizar as vars
        await this.provisionarWorkflow(automacao.id, clinicaId).catch(err => {
            logger_1.logger.error({ err, automacaoId }, 'Falha ao re-provisionar após configuração');
        });
        const final = await prisma_1.prisma.waAutomacao.findUniqueOrThrow({ where: { id: automacaoId } });
        return toWaAutomacaoDTO(final);
    },
    async sincronizar(clinicaId, instanciaId) {
        const tipos = Object.values(client_1.WaTipoAutomacao);
        for (const tipo of tipos) {
            await prisma_1.prisma.waAutomacao.upsert({
                where: {
                    instanciaId_tipo: {
                        instanciaId,
                        tipo
                    }
                },
                create: {
                    tipo,
                    clinicaId,
                    instanciaId,
                    configuracao: {}
                },
                update: {}
            });
        }
    },
    async obterTemplates() {
        return Object.keys(index_1.TEMPLATES).map(tipo => ({
            id: tipo,
            tipo: tipo,
        }));
    },
    async adicionar(clinicaId, tipo, instanciaId) {
        // Verificar se já existe
        const existente = await prisma_1.prisma.waAutomacao.findUnique({
            where: {
                instanciaId_tipo: { instanciaId, tipo }
            }
        });
        if (existente) {
            return toWaAutomacaoDTO(existente);
        }
        const instancia = await prisma_1.prisma.waInstancia.findFirst({
            where: { id: instanciaId, clinicaId }
        });
        if (!instancia) {
            throw new AppError_1.AppError('Instância do WhatsApp não encontrada.', 404);
        }
        let automacao = await prisma_1.prisma.waAutomacao.create({
            data: {
                clinicaId,
                tipo,
                instanciaId,
                ativo: false,
                configuracao: {},
            }
        });
        // Tentamos provisionar logo no n8n
        try {
            if (!automacao.n8nWorkflowId) {
                await this.provisionarWorkflow(automacao.id, clinicaId);
                // Recarregar objecto com o novo ID
                const updated = await prisma_1.prisma.waAutomacao.findUnique({ where: { id: automacao.id } });
                if (updated)
                    automacao = updated; // Update automacao object with new n8nWorkflowId
            }
        }
        catch (err) {
            logger_1.logger.error({ err, automacaoId: automacao.id }, 'Falha ao provisionar workflow no n8n');
        }
        const final = await prisma_1.prisma.waAutomacao.findUniqueOrThrow({ where: { id: automacao.id } });
        return toWaAutomacaoDTO(final);
    },
    /**
     * Dispara um webhook do n8n para uma automação específica
     */
    async dispararWebhook(automacaoId, payload) {
        const automacao = await prisma_1.prisma.waAutomacao.findUnique({
            where: { id: automacaoId },
            select: { n8nWebhookUrl: true, ativo: true }
        });
        if (!automacao?.n8nWebhookUrl || !automacao.ativo)
            return;
        try {
            const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
            await axios.post(automacao.n8nWebhookUrl, payload, { timeout: 10000 });
            logger_1.logger.info({ automacaoId, url: automacao.n8nWebhookUrl }, 'Webhook do n8n disparado com sucesso');
        }
        catch (err) {
            logger_1.logger.error({ err, automacaoId, url: automacao.n8nWebhookUrl }, 'Erro ao disparar webhook do n8n');
        }
    }
};
