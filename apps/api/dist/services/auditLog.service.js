"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogService = void 0;
const logger_1 = require("../lib/logger");
const prisma_1 = require("../lib/prisma");
exports.auditLogService = {
    async log(params) {
        logger_1.logger.info({ audit: true, ...params }, `AuditLog: ${params.accao} on ${params.recurso}`);
        try {
            await prisma_1.prisma.auditLog.create({
                data: {
                    clinicaId: params.clinicaId,
                    actorId: params.actorId,
                    actorTipo: params.actorId.startsWith('apikey:') ? 'API_KEY' : params.actorId === 'sistema' ? 'SISTEMA' : 'UTILIZADOR',
                    accao: params.accao,
                    recurso: params.recurso,
                    recursoId: params.recursoId ?? null,
                    antes: params.antes,
                    depois: params.depois,
                    ip: params.ip ?? null,
                    metadata: params.metadata,
                }
            });
        }
        catch (err) {
            logger_1.logger.error({ err, params }, 'Error writing to AuditLog persistent table');
        }
    },
    async getList(filters, clinicaId) {
        const { actorId, accao, recurso, recursoId, inicio, fim, page = 1, limit = 50 } = filters;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = { clinicaId };
        if (actorId)
            where.actorId = actorId;
        if (accao)
            where.accao = accao;
        if (recurso)
            where.recurso = recurso;
        if (recursoId)
            where.recursoId = recursoId;
        if (inicio || fim) {
            where.criadoEm = {};
            if (inicio)
                where.criadoEm.gte = new Date(inicio);
            if (fim)
                where.criadoEm.lte = new Date(fim);
        }
        const [items, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { criadoEm: 'desc' },
                skip,
                take,
            }),
            prisma_1.prisma.auditLog.count({ where })
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
