import { describe, it, expect, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { jobWaExpirarConversas } from './wa-expirar-conversas.job';
import { subHours } from 'date-fns';

describe('wa-expirar-conversas.job', () => {
  it('deve expirar conversas sem resposta há mais de 24h', async () => {
    const ha25Horas = subHours(new Date(), 25);
    vi.mocked(prisma.waConversa.findMany).mockResolvedValue([
      { id: 'conv-1', estado: 'ETAPA_INICIO', atualizadoEm: ha25Horas }
    ] as any);

    vi.mocked(prisma.waConversa.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.waAutomacao.findFirst).mockResolvedValue({ activa: true } as any);

    await jobWaExpirarConversas();

    expect(prisma.waConversa.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        estado: { notIn: ['CONCLUIDA', 'EXPIRADA'] }
      })
    }));
  });

  it('deve não afectar conversas CONCLUIDAS ou AGUARDA_INPUT', async () => {
    vi.mocked(prisma.waConversa.updateMany).mockResolvedValue({ count: 0 });
    await jobWaExpirarConversas();
    expect(prisma.waConversa.updateMany).toHaveBeenCalled();
  });
});
