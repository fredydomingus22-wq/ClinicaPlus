/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificacoesService } from '../../services/notificacoes.service';
import { prisma } from '../../lib/prisma';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    notificacao: {
      create: vi.fn(),
    },
    utilizador: {
      findUnique: vi.fn(),
    }
  },
}));

describe('NotificacoesService URL Logic (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve manter a URL original se ela já estiver prefixada', async () => {
    const data = {
      utilizadorId: 'user-1',
      titulo: 'Teste',
      mensagem: 'Teste',
      tipo: 'INFO' as const,
      url: '/admin/configuracao'
    };

    await notificacoesService.create(data);

    expect(prisma.notificacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        url: '/admin/configuracao'
      })
    });
  });

  it('deve prefixar uma URL genérica com base no papel do utilizador (FALHA ESPERADA)', async () => {
    // Mock user role as ADMIN
    (prisma.utilizador.findUnique as any).mockResolvedValue({ id: 'user-admin', papel: 'ADMIN' });

    const data = {
      utilizadorId: 'user-admin',
      titulo: 'Novo Agendamento',
      mensagem: 'Mensagem',
      tipo: 'AGENDAMENTO' as const,
      url: '/agendamentos' // URL genérica
    };

    // Act
    await notificacoesService.create(data);

    // Assert - Esperamos que o service agora resolva o papel e prefixe a URL
    // Nota: O teste vai falhar inicialmente porque o service ainda não faz isto.
    expect(prisma.notificacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        url: '/admin/agendamentos'
      })
    });
  });
});
