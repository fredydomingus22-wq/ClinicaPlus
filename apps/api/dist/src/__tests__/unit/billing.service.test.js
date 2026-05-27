"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const vitest_1 = require("vitest");
const billing_service_1 = require("../../services/billing.service");
const prisma_mock_1 = require("../../test/mocks/prisma.mock");
const AppError_1 = require("../../lib/AppError");
vitest_1.vi.mock('../../lib/prisma', () => ({ prisma: prisma_mock_1.mockPrisma }));
(0, vitest_1.describe)('billing.service', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getBillingHistory', () => {
        (0, vitest_1.it)('returns formatted invoices for a clinic', async () => {
            const mockFaturas = [
                {
                    id: 'f1',
                    clinicaId: 'c1',
                    numero: 'FAT-001',
                    valor: 5000,
                    moeda: 'Kz',
                    status: 'PAGO',
                    dataEmissao: new Date('2024-01-01'),
                    dataVencimento: new Date('2024-01-15'),
                    dataPagamento: new Date('2024-01-02'),
                    urlPdf: 'http://test.com/f1.pdf',
                }
            ];
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.faturaAssinatura.findMany).mockResolvedValue(mockFaturas);
            const result = await billing_service_1.billingService.getBillingHistory('c1');
            const [firstFatura] = mockFaturas;
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0]).toEqual({
                id: 'f1',
                clinicaId: 'c1',
                numero: 'FAT-001',
                valor: 5000,
                moeda: 'Kz',
                status: 'PAGO',
                dataEmissao: firstFatura.dataEmissao.toISOString(),
                dataPagamento: firstFatura.dataPagamento.toISOString(),
                dataVencimento: firstFatura.dataVencimento.toISOString(),
                urlPdf: 'http://test.com/f1.pdf',
            });
        });
    });
    (0, vitest_1.describe)('getSubscriptionStatus', () => {
        (0, vitest_1.it)('returns subscription status from subscricao table', async () => {
            const mockSubscricao = {
                id: 's1',
                clinicaId: 'c1',
                plano: 'PRO',
                estado: 'ACTIVA',
                validaAte: new Date('2024-12-31'),
                criadoEm: new Date(),
            };
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.subscricao.findFirst).mockResolvedValue(mockSubscricao);
            const result = await billing_service_1.billingService.getSubscriptionStatus('c1');
            (0, vitest_1.expect)(result.plano).toBe('PRO');
            (0, vitest_1.expect)(result.status).toBe('ACTIVA');
            (0, vitest_1.expect)(result.proximaFatura).toBe(mockSubscricao.validaAte.toISOString());
            (0, vitest_1.expect)(result.diasRestantes).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('returns default status when date is null', async () => {
            const mockSubscricao = {
                id: 's1',
                clinicaId: 'c1',
                plano: 'BASICO',
                estado: 'TRIAL',
                validaAte: null,
                criadoEm: new Date(),
            };
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.subscricao.findFirst).mockResolvedValue(mockSubscricao);
            const result = await billing_service_1.billingService.getSubscriptionStatus('c1');
            (0, vitest_1.expect)(result.plano).toBe('BASICO');
            (0, vitest_1.expect)(result.status).toBe('TRIAL');
            (0, vitest_1.expect)(result.diasRestantes).toBe(0);
        });
        (0, vitest_1.it)('throws 404 if subscription not found', async () => {
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.subscricao.findFirst).mockResolvedValue(null);
            await (0, vitest_1.expect)(billing_service_1.billingService.getSubscriptionStatus('non-existent'))
                .rejects.toThrow(new AppError_1.AppError('Subscrição não encontrada', 404, 'NOT_FOUND'));
        });
    });
});
