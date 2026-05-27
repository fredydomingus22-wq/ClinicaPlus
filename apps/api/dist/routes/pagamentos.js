"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pagamentosRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const types_1 = require("@clinicaplus/types");
const requireRole_1 = require("../middleware/requireRole");
const types_2 = require("@clinicaplus/types");
exports.pagamentosRouter = (0, express_1.Router)();
exports.pagamentosRouter.patch('/:id/seguro', (0, requireRole_1.requireRole)([types_2.Papel.ADMIN, types_2.Papel.RECEPCIONISTA]), async (req, res, next) => {
    try {
        const clinicaId = req.user.clinicaId;
        const pagamentoId = req.params.id;
        if (!pagamentoId)
            return;
        const data = types_1.SeguroUpdateSchema.parse(req.body);
        const seguro = await prisma_1.prisma.seguroPagamento.findUnique({
            where: { pagamentoId: pagamentoId },
            include: { pagamento: true }
        });
        if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Pagamento com seguro não encontrado', 404);
        }
        const updated = await prisma_1.prisma.seguroPagamento.update({
            where: { pagamentoId: pagamentoId },
            data: {
                estado: data.estado,
                valorAprovado: data.valorAprovado ?? null,
                numeroAutorizacao: data.numeroAutorizacao ?? null,
                notasSeguradora: data.notasSeguradora ?? null,
                dataResposta: new Date()
            }
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
