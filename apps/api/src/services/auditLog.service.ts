import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface AuditLogParams {
  actorId: string;
  accao: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'REVOKE' | 'EXPORT';
  recurso: string;
  recursoId?: string;
  antes?: unknown;
  depois?: unknown;
  clinicaId: string;
  ip?: string;
}

export const auditLogService = {
  async log(params: AuditLogParams): Promise<void> {
    logger.info({ audit: true, ...params }, `AuditLog: ${params.accao} on ${params.recurso}`);
    
    try {
      await prisma.auditLog.create({
        data: {
          clinicaId: params.clinicaId,
          actorId: params.actorId,
          actorTipo: params.actorId.startsWith('apikey:') ? 'API_KEY' : params.actorId === 'sistema' ? 'SISTEMA' : 'UTILIZADOR',
          accao: params.accao,
          recurso: params.recurso,
          recursoId: params.recursoId ?? null,
          antes: params.antes as Prisma.InputJsonValue,
          depois: params.depois as Prisma.InputJsonValue,
          ip: params.ip ?? null,
        }
      });
    } catch (err) {
      logger.error({ err, params }, 'Error writing to AuditLog persistent table');
    }
  },

  async getList(filters: Record<string, unknown>, clinicaId: string): Promise<unknown> {
    const { 
      actorId, 
      accao, 
      recurso, 
      recursoId, 
      inicio, 
      fim, 
      page = 1, 
      limit = 50 
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: Prisma.AuditLogWhereInput = { clinicaId };

    if (actorId) where.actorId = actorId;
    if (accao) where.accao = accao;
    if (recurso) where.recurso = recurso;
    if (recursoId) where.recursoId = recursoId;

    if (inicio || fim) {
      where.criadoEm = {};
      if (inicio) where.criadoEm.gte = new Date(inicio as string);
      if (fim) where.criadoEm.lte = new Date(fim as string);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    };
  }
};
