"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const auditLog_service_1 = require("./auditLog.service");
const permissao_service_1 = require("./permissao.service");
const queues_1 = require("../lib/queues");
const subscricao_service_1 = require("./subscricao.service");
const planEnforcement_service_1 = require("./planEnforcement.service");
const logger_1 = require("../lib/logger");
exports.webhooksService = {
    /**
     * Cria um novo webhook para a clínica.
     */
    async create(data, clinicaId, criadoPor) {
        await permissao_service_1.permissaoService.requirePermission(criadoPor, 'webhook', 'manage');
        await planEnforcement_service_1.planEnforcementService.canUseFeature(clinicaId, 'webhook');
        await subscricao_service_1.subscricaoService.verificarLimite(clinicaId, 'webhooks');
        // Gerar um secret aleatório para assinar as entregas
        const secret = crypto_1.default.randomBytes(32).toString('base64');
        const webhook = await prisma_1.prisma.webhook.create({
            data: {
                clinicaId,
                nome: data.nome,
                url: data.url,
                eventos: data.eventos,
                secret,
                ativo: data.ativo ?? true,
            },
        });
        await auditLog_service_1.auditLogService.log({
            actorId: criadoPor,
            clinicaId,
            accao: 'CREATE',
            recurso: 'webhook',
            recursoId: webhook.id,
            depois: { nome: webhook.nome, url: webhook.url, eventos: webhook.eventos }
        });
        return this.mapToDTO(webhook);
    },
    /**
     * Atualiza um webhook existente.
     */
    async update(id, data, clinicaId, atualizadoPor) {
        await permissao_service_1.permissaoService.requirePermission(atualizadoPor, 'webhook', 'manage');
        const existing = await prisma_1.prisma.webhook.findFirstOrThrow({
            where: { id, clinicaId }
        });
        const updated = await prisma_1.prisma.webhook.update({
            where: { id },
            data: {
                ...(data.nome ? { nome: data.nome } : {}),
                ...(data.url ? { url: data.url } : {}),
                ...(data.eventos ? { eventos: data.eventos } : {}),
                ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
            },
        });
        if (updated.ativo && !existing.ativo) {
            await subscricao_service_1.subscricaoService.verificarLimite(clinicaId, 'webhooks');
        }
        await auditLog_service_1.auditLogService.log({
            actorId: atualizadoPor,
            clinicaId,
            accao: 'UPDATE',
            recurso: 'webhook',
            recursoId: id,
            antes: { nome: existing.nome, url: existing.url, eventos: existing.eventos, ativo: existing.ativo },
            depois: { nome: updated.nome, url: updated.url, eventos: updated.eventos, ativo: updated.ativo }
        });
        return this.mapToDTO(updated);
    },
    /**
     * Remove (delete) um webhook.
     */
    async delete(id, clinicaId, removidoPor) {
        await permissao_service_1.permissaoService.requirePermission(removidoPor, 'webhook', 'manage');
        const webhook = await prisma_1.prisma.webhook.findFirstOrThrow({
            where: { id, clinicaId }
        });
        await prisma_1.prisma.webhook.delete({
            where: { id: webhook.id }
        });
        await auditLog_service_1.auditLogService.log({
            actorId: removidoPor,
            clinicaId,
            accao: 'DELETE',
            recurso: 'webhook',
            recursoId: id
        });
    },
    /**
     * Lista webhooks da clínica.
     */
    async list(clinicaId) {
        const webhooks = await prisma_1.prisma.webhook.findMany({
            where: { clinicaId },
            orderBy: { criadoEm: 'desc' }
        });
        return webhooks.map(w => this.mapToDTO(w));
    },
    /**
     * Dispara um evento de webhook para todos os endpoints configurados.
     */
    async trigger(evento, payload, clinicaId) {
        try {
            // 1. Buscar webhooks ativos que escutam este evento
            const webhooks = await prisma_1.prisma.webhook.findMany({
                where: {
                    clinicaId,
                    ativo: true,
                    eventos: {
                        has: evento
                    }
                }
            });
            if (webhooks.length === 0)
                return;
            // 2. Para cada webhook, criar a entrega e enfileirar o job
            for (const wh of webhooks) {
                const canonicalPayload = {
                    id: `evt_${crypto_1.default.randomBytes(12).toString('hex')}`,
                    evento: evento,
                    clinicaId: clinicaId,
                    timestamp: new Date().toISOString(),
                    data: payload
                };
                // Criar registo de entrega
                const entrega = await prisma_1.prisma.webhookEntrega.create({
                    data: {
                        webhookId: wh.id,
                        evento: evento,
                        url: wh.url,
                        payload: canonicalPayload,
                    }
                });
                // Adicionar ao BullMQ
                await queues_1.webhookQueue.add('deliver', {
                    webhookId: wh.id,
                    entregaId: entrega.id,
                    tentativa: 1
                }, {
                    jobId: `webhook-${entrega.id}`,
                    attempts: 5,
                    backoff: { type: 'exponential', delay: 60000 }
                });
                logger_1.logger.info({ webhookId: wh.id, entregaId: entrega.id, evento }, 'Webhook enqueued for delivery');
            }
        }
        catch (err) {
            logger_1.logger.error({ err, evento, clinicaId }, 'Failed to trigger webhooks');
        }
    },
    /**
     * Mapeia objecto Prisma para DTO.
     */
    mapToDTO(w) {
        return {
            id: w.id,
            clinicaId: w.clinicaId,
            nome: w.nome,
            url: w.url,
            eventos: w.eventos,
            ativo: w.ativo,
            ultimoStatus: w.ultimoStatus,
            sucesso: w.sucesso,
            criadoEm: w.criadoEm.toISOString()
        };
    }
};
