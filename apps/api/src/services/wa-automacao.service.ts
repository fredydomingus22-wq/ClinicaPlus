import { WaAutomacao, WaTipoAutomacao, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { n8nApi, TemplateVars } from '../lib/n8nApi';
import { AppError } from '../lib/AppError';
import { apiKeysService } from './apikeys.service';
import { auditLogService } from './auditLog.service';
import { config } from '../lib/config';
import { logger } from '../lib/logger';
import { TEMPLATES } from '../lib/n8n-templates/index';

import { WaAutomacaoDTO } from '@clinicaplus/types';

/**
 * Mapeia um modelo WaAutomacao do Prisma para WaAutomacaoDTO.
 */
function toWaAutomacaoDTO(a: WaAutomacao): WaAutomacaoDTO {
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
export const waAutomacaoService = {
  async activar(automacaoId: string, clinicaId: string, userId: string): Promise<void> {
    const automacao = await prisma.waAutomacao.findFirstOrThrow({
      where: { id: automacaoId, clinicaId },
      include: { instancia: true },
    });

    if (!automacao.instancia || automacao.instancia.estado !== 'CONECTADO') {
      throw new AppError(
        'Liga o WhatsApp desta instância antes de activar a automação.',
        400,
        'WA_INSTANCIA_DESCONECTADA'
      );
    }

    // Se ainda não tem workflowId (foi adicionado mas n8n falhou na altura), criamos agora
    if (!automacao.n8nWorkflowId) {
       try {
         await this.provisionarWorkflow(automacao.id, clinicaId);
         // Recarregar objecto com o novo ID
         const updated = await prisma.waAutomacao.findUnique({ where: { id: automacaoId } });
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         if (updated) (automacao as any).n8nWorkflowId = updated.n8nWorkflowId;
       } catch (err) {
         const error = err as Error;
         logger.error({ err: error.message, stack: error.stack, automacaoId }, 'Falha automática de provisionamento ao activar');
         throw new AppError(`Não foi possível criar o workflow no n8n: ${error.message}`, 500);
       }
    }

    try {
      if (automacao.n8nWorkflowId) {
        logger.info({ 
          workflowId: automacao.n8nWorkflowId, 
          n8nBaseUrl: config.N8N_BASE_URL 
        }, 'A activar workflow no n8n');
        
        await n8nApi.activar(automacao.n8nWorkflowId);
      }
    } catch (error: unknown) {
      const err = error as { statusCode?: number; response?: { status?: number }; message?: string };
      const status = err.statusCode || err.response?.status || 502;
      const message = err.message || 'Falha na comunicação com o n8n';
      
      logger.error({ 
        err: error, 
        automacaoId, 
        workflowId: automacao.n8nWorkflowId,
        n8nBaseUrl: config.N8N_BASE_URL 
      }, 'Erro ao activar workflow no n8n');
      
      throw new AppError(
        `N8N Error: ${message}`,
        status,
        'N8N_ACTIVATION_ERROR',
        { workflowId: automacao.n8nWorkflowId }
      );
    }

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: { ativo: true },
    });

    await auditLogService.log({
      actorId: userId,
      clinicaId,
      accao: 'UPDATE',
      recurso: 'wa_automacao',
      recursoId: automacaoId,
      depois: { ativo: true },
    });
  },

  async desactivar(automacaoId: string, clinicaId: string, userId: string): Promise<void> {
    const automacao = await prisma.waAutomacao.findFirstOrThrow({
      where: { id: automacaoId, clinicaId },
    });

    if (automacao.n8nWorkflowId) {
      try {
        await n8nApi.desactivar(automacao.n8nWorkflowId);
      } catch {
        // Ignorar
      }
    }

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: { ativo: false },
    });

    await auditLogService.log({
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
  async provisionarWorkflow(automacaoId: string, clinicaId: string): Promise<void> {
    const automacao = await prisma.waAutomacao.findUniqueOrThrow({
      where: { id: automacaoId },
      include: { instancia: true }
    });

    if (!automacao.instancia) {
      throw new AppError('Instância não vinculada à automação.', 400);
    }

    const apiKey = await apiKeysService.getOrCreateInternal(clinicaId, `n8n-${automacao.tipo.toLowerCase()}`);
    
    const clinica = await prisma.clinica.findUniqueOrThrow({ 
      where: { id: clinicaId },
      select: { slug: true }
    });

    if (automacao.n8nWorkflowId) {
      await n8nApi.eliminar(automacao.n8nWorkflowId).catch(err => {
        logger.warn({ err, workflowId: automacao.n8nWorkflowId }, 'Falha ao eliminar workflow antigo ao re-provisionar');
      });
    }

    const vars: TemplateVars = {
      clinicaId,
      clinicaSlug: clinica.slug,
      instanceName: automacao.instancia.evolutionName,
      apiBaseUrl: config.API_PUBLIC_URL || config.FRONTEND_URL.replace(':5173', ':3001'),
      apiKey: apiKey.tokenPlain,
      automacaoId: automacao.id,
      configuracao: (automacao.configuracao as Record<string, unknown>) || {},
    };

    const { workflowId, webhookPath } = await n8nApi.criarWorkflow(automacao.tipo, vars);

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: {
        n8nWorkflowId: workflowId,
        n8nWebhookPath: webhookPath,
        n8nWebhookUrl: `${config.N8N_BASE_URL}/webhook/${webhookPath}`
      },
    });
  },

  async listar(clinicaId: string, instanciaId?: string): Promise<WaAutomacaoDTO[]> {
    const automacoes = await prisma.waAutomacao.findMany({
      where: { 
        clinicaId,
        ...(instanciaId && { instanciaId })
      },
      orderBy: { tipo: 'asc' },
    });
    return automacoes.map(toWaAutomacaoDTO);
  },

  async configurar(automacaoId: string, configuracao: Prisma.InputJsonValue, clinicaId: string): Promise<WaAutomacaoDTO> {
    const automacao = await prisma.waAutomacao.update({
      where: { id: automacaoId, clinicaId },
      data: {
        configuracao,
        atualizadoEm: new Date()
      },
    });

    await auditLogService.log({
      actorId: 'sistema',
      clinicaId,
      accao: 'UPDATE',
      recurso: 'wa_automacao',
      recursoId: automacaoId,
      depois: { configuracao }
    });

    // Se configurou algo novo, re-provisionamos no n8n para actualizar as vars
    await this.provisionarWorkflow(automacao.id, clinicaId).catch(err => {
      logger.error({ err, automacaoId }, 'Falha ao re-provisionar após configuração');
    });

    const final = await prisma.waAutomacao.findUniqueOrThrow({ where: { id: automacaoId } });
    return toWaAutomacaoDTO(final);
  },

  async sincronizar(clinicaId: string, instanciaId: string): Promise<void> {
    const tipos = Object.values(WaTipoAutomacao);
    
    for (const tipo of tipos) {
      await prisma.waAutomacao.upsert({
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

  async obterTemplates(): Promise<{ id: string; tipo: WaTipoAutomacao }[]> {
    return Object.keys(TEMPLATES).map(tipo => ({
      id: tipo,
      tipo: tipo as WaTipoAutomacao,
    }));
  },

  async adicionar(clinicaId: string, tipo: WaTipoAutomacao, instanciaId: string): Promise<WaAutomacaoDTO> {
    // Verificar se já existe
    const existente = await prisma.waAutomacao.findUnique({
      where: {
        instanciaId_tipo: { instanciaId, tipo }
      }
    });

    if (existente) {
      return toWaAutomacaoDTO(existente);
    }

    const instancia = await prisma.waInstancia.findFirst({
      where: { id: instanciaId, clinicaId }
    });

    if (!instancia) {
      throw new AppError('Instância do WhatsApp não encontrada.', 404);
    }

    let automacao = await prisma.waAutomacao.create({
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
        const updated = await prisma.waAutomacao.findUnique({ where: { id: automacao.id } });
        if (updated) automacao = updated; // Update automacao object with new n8nWorkflowId
      }
    } catch (err) {
      logger.error({ err, automacaoId: automacao.id }, 'Falha ao provisionar workflow no n8n');
    }

    const final = await prisma.waAutomacao.findUniqueOrThrow({ where: { id: automacao.id } });
    return toWaAutomacaoDTO(final);
  },

  /**
   * Dispara um webhook do n8n para uma automação específica
   */
  async dispararWebhook(automacaoId: string, payload: unknown): Promise<void> {
    const automacao = await prisma.waAutomacao.findUnique({
      where: { id: automacaoId },
      select: { n8nWebhookUrl: true, ativo: true }
    });

    if (!automacao?.n8nWebhookUrl || !automacao.ativo) return;

    try {
      const axios = (await import('axios')).default;
      await axios.post(automacao.n8nWebhookUrl, payload, { timeout: 10000 });
      logger.info({ automacaoId, url: automacao.n8nWebhookUrl }, 'Webhook do n8n disparado com sucesso');
    } catch (err) {
      logger.error({ err, automacaoId, url: automacao.n8nWebhookUrl }, 'Erro ao disparar webhook do n8n');
    }
  }
};
