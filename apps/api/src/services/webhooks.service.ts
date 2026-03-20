import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { auditLogService } from './auditLog.service';
import { permissaoService } from './permissao.service';
import { webhookQueue } from '../lib/queues';
import { 
  WebhookCreateInput, 
  WebhookUpdateInput, 
  WebhookDTO, 
  EventoWebhook 
} from '@clinicaplus/types';
import { logger } from '../lib/logger';
import { Webhook, Prisma } from '@prisma/client';

export const webhooksService = {
  /**
   * Cria um novo webhook para a clínica.
   */
  async create(data: WebhookCreateInput, clinicaId: string, criadoPor: string): Promise<WebhookDTO> {
    await permissaoService.requirePermission(criadoPor, 'webhook', 'manage');

    // Gerar um secret aleatório para assinar as entregas
    const secret = crypto.randomBytes(32).toString('base64');

    const webhook = await prisma.webhook.create({
      data: {
        clinicaId,
        nome: data.nome,
        url: data.url,
        eventos: data.eventos,
        secret,
        ativo: data.ativo ?? true,
      },
    });

    await auditLogService.log({
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
  async update(id: string, data: WebhookUpdateInput, clinicaId: string, atualizadoPor: string): Promise<WebhookDTO> {
    await permissaoService.requirePermission(atualizadoPor, 'webhook', 'manage');
    const existing = await prisma.webhook.findFirstOrThrow({
      where: { id, clinicaId }
    });

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        ...(data.nome ? { nome: data.nome } : {}),
        ...(data.url ? { url: data.url } : {}),
        ...(data.eventos ? { eventos: data.eventos } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });

    await auditLogService.log({
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
  async delete(id: string, clinicaId: string, removidoPor: string): Promise<void> {
    await permissaoService.requirePermission(removidoPor, 'webhook', 'manage');
    const webhook = await prisma.webhook.findFirstOrThrow({
      where: { id, clinicaId }
    });

    await prisma.webhook.delete({
      where: { id: webhook.id }
    });

    await auditLogService.log({
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
  async list(clinicaId: string): Promise<WebhookDTO[]> {
    const webhooks = await prisma.webhook.findMany({
      where: { clinicaId },
      orderBy: { criadoEm: 'desc' }
    });

    return webhooks.map(w => this.mapToDTO(w));
  },

  /**
   * Dispara um evento de webhook para todos os endpoints configurados.
   */
  async trigger(evento: EventoWebhook, payload: unknown, clinicaId: string): Promise<void> {
    try {
      // 1. Buscar webhooks ativos que escutam este evento
      const webhooks = await prisma.webhook.findMany({
        where: {
          clinicaId,
          ativo: true,
          eventos: {
            has: evento
          }
        }
      });

      if (webhooks.length === 0) return;

      // 2. Para cada webhook, criar a entrega e enfileirar o job
      for (const wh of webhooks) {
        // Criar registo de entrega
        const entrega = await prisma.webhookEntrega.create({
          data: {
            webhookId: wh.id,
            evento: evento,
            url: wh.url,
            payload: payload as Prisma.InputJsonValue,
          }
        });

        // Adicionar ao BullMQ
        await webhookQueue.add(
          'deliver',
          { 
            webhookId: wh.id, 
            entregaId: entrega.id, 
            tentativa: 1 
          },
          { 
            jobId: `webhook-${entrega.id}`, 
            attempts: 5, 
            backoff: { type: 'exponential', delay: 60000 } 
          }
        );

        logger.info({ webhookId: wh.id, entregaId: entrega.id, evento }, 'Webhook enqueued for delivery');
      }
    } catch (err) {
      logger.error({ err, evento, clinicaId }, 'Failed to trigger webhooks');
    }
  },

  /**
   * Mapeia objecto Prisma para DTO.
   */
  mapToDTO(w: Webhook): WebhookDTO {
    return {
      id: w.id,
      clinicaId: w.clinicaId,
      nome: w.nome,
      url: w.url,
      eventos: w.eventos as EventoWebhook[],
      ativo: w.ativo,
      ultimoStatus: w.ultimoStatus,
      sucesso: w.sucesso,
      criadoEm: w.criadoEm.toISOString()
    };
  }
};
