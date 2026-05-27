"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_wa_mock_1 = require("../../mocks/prisma-wa.mock");
// Mock do Prisma
vitest_1.vi.mock('../../../lib/prisma', () => ({
    prisma: prisma_wa_mock_1.mockPrisma
}));
const scheduler_service_1 = require("../../../services/scheduler.service");
(0, vitest_1.describe)('Scheduler Service - WA Expiry', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('deve marcar conversas inativas como EXPIRADA', async () => {
        const conversasAExpirar = [
            { id: 'conv-1' },
            { id: 'conv-2' }
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prisma_wa_mock_1.mockPrisma.waConversa.findMany.mockResolvedValue(conversasAExpirar);
        await scheduler_service_1.schedulerService.processarConversasExpiradas();
        (0, vitest_1.expect)(prisma_wa_mock_1.mockPrisma.waConversa.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            where: vitest_1.expect.objectContaining({
                estado: { in: ['AGUARDA_INPUT', 'EM_FLUXO_MARCACAO', 'AGUARDA_CONFIRMACAO'] }
            })
        }));
        (0, vitest_1.expect)(prisma_wa_mock_1.mockPrisma.waConversa.updateMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            where: { id: { in: ['conv-1', 'conv-2'] } },
            data: { estado: 'EXPIRADA', etapaFluxo: null }
        }));
    });
    (0, vitest_1.it)('não deve fazer nada se não houver conversas a expirar', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prisma_wa_mock_1.mockPrisma.waConversa.findMany.mockResolvedValue([]);
        await scheduler_service_1.schedulerService.processarConversasExpiradas();
        (0, vitest_1.expect)(prisma_wa_mock_1.mockPrisma.waConversa.updateMany).not.toHaveBeenCalled();
    });
});
