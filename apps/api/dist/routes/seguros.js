"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.segurosRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireRole_1 = require("../middleware/requireRole");
const types_1 = require("@clinicaplus/types");
exports.segurosRouter = (0, express_1.Router)();
// List Seguros (with filters)
exports.segurosRouter.get('/', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.RECEPCIONISTA, types_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const clinicaId = req.user.clinicaId;
        const { estado, seguradora, pacienteId, page = '1', limit = '10' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {
            pagamento: {
                clinicaId
            }
        };
        if (estado)
            where.estado = estado;
        if (seguradora)
            where.seguradora = seguradora;
        // If filtering by paciente, we need to go through pagamento -> fatura -> paciente
        if (pacienteId) {
            where.pagamento = {
                ...where.pagamento,
                fatura: {
                    pacienteId: pacienteId
                }
            };
        }
        const [total, seguros] = await Promise.all([
            prisma_1.prisma.seguroPagamento.count({ where }),
            prisma_1.prisma.seguroPagamento.findMany({
                where,
                skip,
                take,
                orderBy: { dataSubmissao: 'desc' }, // or criadoEm if it existed, but we have to order by something logical. Let's order by pagamento.criadoEm
                include: {
                    pagamento: {
                        include: {
                            fatura: {
                                include: {
                                    paciente: {
                                        select: { id: true, nome: true, numeroPaciente: true, nif: true }
                                    }
                                }
                            }
                        }
                    }
                }
            })
        ]);
        // Format for frontend
        const items = seguros.map(s => ({
            id: s.id,
            pagamentoId: s.pagamentoId,
            seguradora: s.seguradora,
            numeroBeneficiario: s.numeroBeneficiario,
            numeroAutorizacao: s.numeroAutorizacao,
            valorSolicitado: s.valorSolicitado,
            valorAprovado: s.valorAprovado,
            estado: s.estado,
            dataSubmissao: s.dataSubmissao?.toISOString(),
            dataResposta: s.dataResposta?.toISOString(),
            notasSeguradora: s.notasSeguradora,
            pagamento: {
                id: s.pagamento.id,
                valor: s.pagamento.valor,
                criadoEm: s.pagamento.criadoEm.toISOString(),
                fatura: {
                    id: s.pagamento.fatura.id,
                    numeroFatura: s.pagamento.fatura.numeroFatura,
                    estado: s.pagamento.fatura.estado,
                    paciente: s.pagamento.fatura.paciente
                }
            }
        }));
        res.json({
            items,
            total,
            page: Number(page),
            limit: Number(limit)
        });
    }
    catch (err) {
        next(err);
    }
});
// Update Seguro Status (re-using the logic, or we can just call this endpoint directly)
exports.segurosRouter.patch('/:pagamentoId/status', (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.RECEPCIONISTA, types_1.Papel.MEDICO]), async (req, res, next) => {
    try {
        const clinicaId = req.user.clinicaId;
        const pagamentoId = req.params.pagamentoId;
        const { estado, valorAprovado, numeroAutorizacao, notasSeguradora } = req.body;
        const seguro = await prisma_1.prisma.seguroPagamento.findUnique({
            where: { pagamentoId },
            include: { pagamento: true }
        });
        if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
            res.status(404).json({ error: 'Seguro não encontrado' });
            return;
        }
        const updated = await prisma_1.prisma.seguroPagamento.update({
            where: { pagamentoId },
            data: {
                estado,
                valorAprovado: valorAprovado ?? null,
                numeroAutorizacao: numeroAutorizacao ?? null,
                notasSeguradora: notasSeguradora ?? null,
                // If moving to SUBMETIDO, record submissao
                ...(estado === 'SUBMETIDO' && !seguro.dataSubmissao ? { dataSubmissao: new Date() } : {}),
                // If moving to final states, record resposta
                ...(['APROVADO', 'PARCIAL', 'GLOSADO', 'CANCELADO', 'PAGO'].includes(estado) ? { dataResposta: new Date() } : {})
            }
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
