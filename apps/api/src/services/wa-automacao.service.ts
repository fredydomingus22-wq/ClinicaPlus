import { WaAutomacao, WaTipoAutomacao } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { n8nApi, TemplateVars } from '../lib/n8nApi';
import { AppError } from '../lib/AppError';
import { apiKeysService } from './apikeys.service';
import { auditLogService } from './auditLog.service';
import { config } from '../lib/config';
import { logger } from '../lib/logger';
import { TEMPLATES } from '../lib/n8n-templates/index';

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
         logger.error({ err, automacaoId }, 'Falha automática de provisionamento ao activar');
         throw new AppError('Não foi possível criar o workflow no n8n. Verifica a ligação com o n8n.', 500);
       }
    }

    try {
      if (automacao.n8nWorkflowId) {
        await n8nApi.activar(automacao.n8nWorkflowId);
      }
    } catch (error) {
      logger.error({ error, automacaoId }, 'Erro ao criar workflow no n8n');
      throw new Error('Falha na comunicação com o n8n.', { cause: error });
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

    const vars: TemplateVars = {
      clinicaId,
      clinicaSlug: clinica.slug,
      instanceName: automacao.instancia.evolutionName,
      apiBaseUrl: config.API_PUBLIC_URL || config.FRONTEND_URL.replace(':5173', ':3001'),
      apiKey: apiKey.tokenPlain,
      configuracao: (automacao.configuracao as Record<string, unknown>) || {},
    };

    const { workflowId, webhookPath } = await n8nApi.criarWorkflow(automacao.tipo, vars);

    await prisma.waAutomacao.update({
      where: { id: automacaoId },
      data: {
        n8nWorkflowId: workflowId,
        n8nWebhookPath: webhookPath,
      },
    });
  },

  async listar(clinicaId: string, waInstanciaId?: string): Promise<WaAutomacao[]> {
    return prisma.waAutomacao.findMany({
      where: { 
        clinicaId,
        ...(waInstanciaId && { waInstanciaId })
      },
      orderBy: { tipo: 'asc' },
    });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async configurar(automacaoId: string, configuracao: any, clinicaId: string): Promise<WaAutomacao> {
    const automacao = await prisma.waAutomacao.update({
      where: { id: automacaoId, clinicaId },
      data: { configuracao },
    });

    await auditLogService.log({
      actorId: 'sistema',
      clinicaId,
      accao: 'UPDATE',
      recurso: 'wa_automacao',
      recursoId: automacaoId,
      depois: { configuracao }
    });

    return automacao;
  },

  async obterTemplates(): Promise<{ id: string; tipo: WaTipoAutomacao }[]> {
    return Object.keys(TEMPLATES).map(tipo => ({
      id: tipo,
      tipo: tipo as WaTipoAutomacao,
    }));
  },

  async adicionar(clinicaId: string, tipo: WaTipoAutomacao, waInstanciaId: string): Promise<WaAutomacao | null> {
    const instancia = await prisma.waInstancia.findFirst({
      where: { id: waInstanciaId, clinicaId }
    });

    if (!instancia) {
      throw new AppError('Instância do WhatsApp não encontrada.', 404);
    }

    // Usando a chave composta se existir, senão buscamos pelo ID primeiro.
    // O erro do lint sugere que waInstanciaId_tipo pode não estar a ser reconhecido como único.
    // Vamos garantir que o findUnique funcione ou usar findFirst.
    let automacao = await prisma.waAutomacao.findFirst({
      where: { waInstanciaId, tipo }
    });

    if (!automacao) {
      automacao = await prisma.waAutomacao.create({
        data: {
          clinicaId,
          tipo,
          waInstanciaId,
          ativo: false,
          configuracao: {}
        }
      });
    }

    // Tentamos provisionar logo no n8n
    try {
      if (!automacao.n8nWorkflowId) {
        await this.provisionarWorkflow(automacao.id, clinicaId);
      }
    } catch (err) {
      logger.error({ err, automacaoId: automacao.id }, 'Falha ao provisionar workflow no n8n');
    }

    return prisma.waAutomacao.findUnique({ where: { id: automacao.id } });
  }
};
