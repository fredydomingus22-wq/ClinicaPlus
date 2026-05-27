"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
exports.billingService = {
    /**
     * Returns the billing history (invoices) for a specific clinic.
     */
    async getBillingHistory(clinicaId) {
        const faturas = await prisma_1.prisma.faturaAssinatura.findMany({
            where: { clinicaId },
            orderBy: { dataEmissao: 'desc' },
        });
        return faturas.map((f) => ({
            id: f.id,
            clinicaId: f.clinicaId,
            numero: f.numero,
            valor: f.valor,
            moeda: f.moeda,
            status: f.status,
            dataEmissao: f.dataEmissao.toISOString(),
            dataPagamento: f.dataPagamento?.toISOString() || null,
            dataVencimento: f.dataVencimento.toISOString(),
            urlPdf: f.urlPdf,
        }));
    },
    /**
     * Returns the current subscription status for a specific clinic.
     */
    async getSubscriptionStatus(clinicaId) {
        const subscricao = await prisma_1.prisma.subscricao.findFirst({
            where: { clinicaId },
            orderBy: { criadoEm: 'desc' },
        });
        if (!subscricao) {
            throw new AppError_1.AppError('Subscrição não encontrada', 404, 'NOT_FOUND');
        }
        const hoje = new Date();
        const difTempo = subscricao.validaAte
            ? subscricao.validaAte.getTime() - hoje.getTime()
            : 0;
        const diasRestantes = Math.ceil(difTempo / (1000 * 3600 * 24));
        return {
            plano: subscricao.plano,
            status: subscricao.estado,
            proximaFatura: subscricao.validaAte?.toISOString() || hoje.toISOString(),
            diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
        };
    }
};
