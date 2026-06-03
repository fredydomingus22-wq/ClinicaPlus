import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UtilizadorDTO } from '@clinicaplus/types';

const axiosPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    post: axiosPost,
  },
}));

const utilizador: UtilizadorDTO = {
  id: 'user-1',
  clinicaId: 'clinic-1',
  nome: 'Admin',
  email: 'admin@clinicaplus.test',
  avatarUrl: null,
  papel: 'ADMIN',
  ativo: true,
  criadoEm: '2026-01-01T00:00:00.000Z',
  atualizadoEm: '2026-01-01T00:00:00.000Z',
};

describe('refreshSession', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.test/api');
    axiosPost.mockReset();
  });

  it('partilha a mesma chamada HTTP para refreshes concorrentes', async () => {
    axiosPost.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'access-token-1',
          utilizador,
        },
      },
    });

    const { refreshSession } = await import('../client');
    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(first.accessToken).toBe('access-token-1');
    expect(second.accessToken).toBe('access-token-1');
  });
});
