import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../../mocks/prisma-wa.mock';

// Mock do Prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrisma
}));

import { schedulerService } from '../../../services/scheduler.service';

describe('Scheduler Service - WA Expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve marcar conversas inativas como EXPIRADA', async () => {
    const conversasAExpirar = [
      { id: 'conv-1' },
      { id: 'conv-2' }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.waConversa.findMany as any).mockResolvedValue(conversasAExpirar);

    await schedulerService.processarConversasExpiradas();

    expect(mockPrisma.waConversa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        estado: { in: ['AGUARDA_INPUT', 'EM_FLUXO_MARCACAO', 'AGUARDA_CONFIRMACAO'] }
      })
    }));

    expect(mockPrisma.waConversa.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['conv-1', 'conv-2'] } },
      data: { estado: 'EXPIRADA', etapaFluxo: null }
    }));
  });

  it('não deve fazer nada se não houver conversas a expirar', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.waConversa.findMany as any).mockResolvedValue([]);

    await schedulerService.processarConversasExpiradas();

    expect(mockPrisma.waConversa.updateMany).not.toHaveBeenCalled();
  });
});
