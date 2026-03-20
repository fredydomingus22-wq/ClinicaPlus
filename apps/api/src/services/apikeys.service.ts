import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { auditLogService } from './auditLog.service';
import { planEnforcementService } from './planEnforcement.service';
import { subscricaoService } from './subscricao.service';
import { permissaoService } from './permissao.service';
import { ApiKeyCreateInput, ApiKeyResponse, ApiKeyDTO, EscopoApiKey } from '@clinicaplus/types';

export const apiKeysService = {
  /**
   * Cria uma nova API Key para a clínica.
   * O token completo é devolvido APENAS UMA VEZ na criação.
   */
  async create(data: ApiKeyCreateInput, clinicaId: string, criadoPor: string): Promise<ApiKeyResponse> {
    // 0. Verificar permissão RBAC
    await permissaoService.requirePermission(criadoPor, 'apikey', 'manage');

    // 1. Verificar permissão no plano
    await planEnforcementService.canUseFeature(clinicaId, 'apiKey');

    // 2. Verificar limite de keys do plano
    await subscricaoService.verificarLimite(clinicaId, 'apikeys');

    // 3. Gerar token: cp_live_ + 64 chars hex (32 bytes)
    const secret = crypto.randomBytes(32).toString('hex');
    const token = `cp_live_${secret}`;
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');
    const prefixo = token.slice(0, 12); // "cp_live_..."

    // 4. Guardar no DB
    const apiKey = await prisma.apiKey.create({
      data: {
        clinicaId,
        nome: data.nome,
        keyHash,
        prefixo,
        escopos: data.escopos,
        criadoPor,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
      }
    });

    // 5. Audit Log
    await auditLogService.log({
      actorId: criadoPor,
      clinicaId,
      accao: 'CREATE',
      recurso: 'apikey',
      recursoId: apiKey.id,
      depois: { nome: apiKey.nome, prefixo: apiKey.prefixo, escopos: apiKey.escopos }
    });

    return {
      id: apiKey.id,
      nome: apiKey.nome,
      prefixo: apiKey.prefixo,
      escopos: apiKey.escopos as unknown as EscopoApiKey[],
      ativo: apiKey.ativo,
      ultimoUso: apiKey.ultimoUso?.toISOString() || null,
      expiresAt: apiKey.expiresAt?.toISOString() || null,
      criadoEm: apiKey.criadoEm.toISOString(),
      token // DEVOLVIDO UMA VEZ
    };
  },

  /**
   * Revoga uma API Key (desativação lógica).
   */
  async revoke(id: string, clinicaId: string, revogadoPor: string): Promise<void> {
    const apiKey = await prisma.apiKey.findFirstOrThrow({
      where: { id, clinicaId }
    });

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { ativo: false }
    });

    await auditLogService.log({
      actorId: revogadoPor,
      clinicaId,
      accao: 'REVOKE',
      recurso: 'apikey',
      recursoId: apiKey.id
    });
  },

  /**
   * Lista as API Keys de uma clínica.
   */
  async list(clinicaId: string): Promise<ApiKeyDTO[]> {
    const keys = await prisma.apiKey.findMany({
      where: { clinicaId },
      orderBy: { criadoEm: 'desc' }
    });

    return keys.map(k => ({
      id: k.id,
      nome: k.nome,
      prefixo: k.prefixo,
      escopos: k.escopos as unknown as EscopoApiKey[],
      ativo: k.ativo,
      ultimoUso: k.ultimoUso?.toISOString() || null,
      expiresAt: k.expiresAt?.toISOString() || null,
      criadoEm: k.criadoEm.toISOString()
    }));
  },

  /**
   * Obtém ou cria uma API Key interna para uso do sistema (n8n, workers).
   */
  async getOrCreateInternal(clinicaId: string, nome: string): Promise<{ tokenPlain: string }> {
    // 1. Tentar encontrar uma ativa
    const existente = await prisma.apiKey.findFirst({
      where: { clinicaId, nome, ativo: true }
    });

    if (existente) {
      await prisma.apiKey.update({
        where: { id: existente.id },
        data: { ativo: false }
      });
    }

    // 2. Gerar novo token
    const secret = crypto.randomBytes(32).toString('hex');
    const token = `cp_internal_${secret}`;
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');
    const prefix = token.slice(0, 16);

    await prisma.apiKey.create({
      data: {
        clinicaId,
        nome,
        keyHash,
        prefixo: prefix,
        escopos: ['all'] as unknown as EscopoApiKey[],
        criadoPor: 'sistema',
        expiresAt: null
      }
    });

    return { tokenPlain: token };
  }
};
