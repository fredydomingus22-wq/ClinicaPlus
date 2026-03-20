import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { Prisma, Papel } from '@prisma/client';
import { requireRole } from '../middleware/requireRole';
import { subDays } from 'date-fns';

const router = Router();

// Apenas ADMIN e SUPER_ADMIN podem aceder a logs de auditoria
router.use(requireRole([Papel.ADMIN, Papel.SUPER_ADMIN]));

/**
 * GET /api/audit-logs
 * Retorna os logs de auditoria com filtros e paginação.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      actorId, 
      accao, 
      recurso, 
      recursoId, 
      inicio, 
      fim, 
      page = 1, 
      limit = 50 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // req.clinica is populated by tenantMiddleware
    if (!req.clinica) {
      throw new AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT');
    }

    const clinicaId = req.clinica.id;

    // Filtros
    const where: Prisma.AuditLogWhereInput = {
      clinicaId
    };

    if (actorId) where.actorId = String(actorId);
    if (accao) where.accao = String(accao);
    if (recurso) where.recurso = String(recurso);
    if (recursoId) where.recursoId = String(recursoId);

    const plan = req.clinica.plano;
    let retentionDate: Date | null = null;
    if (plan === 'BASICO') {
      retentionDate = subDays(new Date(), 30);
    } else if (plan === 'PRO') {
      retentionDate = subDays(new Date(), 365);
    }

    if (inicio || fim || retentionDate) {
      where.criadoEm = {};
      if (inicio) where.criadoEm.gte = new Date(String(inicio));
      if (fim) where.criadoEm.lte = new Date(String(fim));
      
      if (retentionDate) {
        // Enforce retention: must be >= retentionDate
        const currentGte = where.criadoEm.gte as Date | undefined;
        if (!currentGte || currentGte < retentionDate) {
          where.criadoEm.gte = retentionDate;
        }
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/audit-logs/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.clinica) {
      throw new AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT');
    }

    const log = await prisma.auditLog.findFirst({
      where: {
        id: String(req.params.id),
        clinicaId: req.clinica.id
      }
    });

    if (!log) {
      throw new AppError('Log não encontrado', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

export default router;
