"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const client_1 = require("@prisma/client");
const requireRole_1 = require("../middleware/requireRole");
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
// Apenas ADMIN e SUPER_ADMIN podem aceder a logs de auditoria
router.use((0, requireRole_1.requireRole)([client_1.Papel.ADMIN, client_1.Papel.SUPER_ADMIN]));
/**
 * GET /api/audit-logs
 * Retorna os logs de auditoria com filtros e paginação.
 */
router.get('/', async (req, res, next) => {
    try {
        const { actorId, accao, recurso, recursoId, inicio, fim, page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        // req.clinica is populated by tenantMiddleware
        if (!req.clinica) {
            throw new AppError_1.AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT');
        }
        const clinicaId = req.clinica.id;
        // Filtros
        const where = {
            clinicaId
        };
        if (actorId)
            where.actorId = String(actorId);
        if (accao)
            where.accao = String(accao);
        if (recurso)
            where.recurso = String(recurso);
        if (recursoId)
            where.recursoId = String(recursoId);
        const plan = req.clinica.plano;
        let retentionDate = null;
        if (plan === 'BASICO') {
            retentionDate = (0, date_fns_1.subDays)(new Date(), 30);
        }
        else if (plan === 'PRO') {
            retentionDate = (0, date_fns_1.subDays)(new Date(), 365);
        }
        if (inicio || fim || retentionDate) {
            where.criadoEm = {};
            if (inicio)
                where.criadoEm.gte = new Date(String(inicio));
            if (fim)
                where.criadoEm.lte = new Date(String(fim));
            if (retentionDate) {
                // Enforce retention: must be >= retentionDate
                const currentGte = where.criadoEm.gte;
                if (!currentGte || currentGte < retentionDate) {
                    where.criadoEm.gte = retentionDate;
                }
            }
        }
        const [logs, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { criadoEm: 'desc' },
                skip,
                take,
            }),
            prisma_1.prisma.auditLog.count({ where })
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
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/audit-logs/:id
 */
router.get('/:id', async (req, res, next) => {
    try {
        if (!req.clinica) {
            throw new AppError_1.AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT');
        }
        const log = await prisma_1.prisma.auditLog.findFirst({
            where: {
                id: String(req.params.id),
                clinicaId: req.clinica.id
            }
        });
        if (!log) {
            throw new AppError_1.AppError('Log não encontrado', 404, 'NOT_FOUND');
        }
        res.json({ success: true, data: log });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
