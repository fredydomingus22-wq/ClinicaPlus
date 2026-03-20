import { describe, it, expect, vi, beforeEach } from 'vitest';
import { permissaoService } from '../../services/permissao.service';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { Papel } from '@prisma/client';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    utilizador: { findUnique: vi.fn() },
    utilizadorPermissao: { findFirst: vi.fn() },
    rolePermissao: { findFirst: vi.fn() },
  },
}));

vi.mock('../../lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
  },
}));

describe('permissaoService', () => {
  const userId = 'user-123';
  const recurso = 'fatura';
  const accao = 'create';
  const codigo = 'fatura:create';
  const cacheKey = `perm:${userId}:${codigo}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('check', () => {
    it('deve retornar true se estiver no cache Redis', async () => {
      vi.mocked(redis.get).mockResolvedValue('1');

      const result = await permissaoService.check(userId, recurso, accao);

      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalledWith(cacheKey);
      expect(prisma.utilizador.findUnique).not.toHaveBeenCalled();
    });

    it('deve retornar false se estiver no cache Redis como negado', async () => {
      vi.mocked(redis.get).mockResolvedValue('0');

      const result = await permissaoService.check(userId, recurso, accao);

      expect(result).toBe(false);
      expect(redis.get).toHaveBeenCalledWith(cacheKey);
    });

    it('deve permitir bypass total para SUPER_ADMIN', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: Papel.SUPER_ADMIN } as unknown as import('@prisma/client').Utilizador);

      const result = await permissaoService.check(userId, recurso, accao);

      expect(result).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(cacheKey, '1', 'EX', 3600);
    });

    it('deve respeitar override GRANT do utilizador', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: Papel.RECEPCIONISTA } as unknown as import('@prisma/client').Utilizador);
      vi.mocked(prisma.utilizadorPermissao.findFirst).mockResolvedValue({ tipo: 'GRANT' } as unknown as import('@prisma/client').UtilizadorPermissao);

      const result = await permissaoService.check(userId, recurso, accao);

      expect(result).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(cacheKey, '1', 'EX', 3600);
      expect(prisma.rolePermissao.findFirst).not.toHaveBeenCalled();
    });

    it('deve respeitar override DENY do utilizador mesmo que role permita', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: Papel.RECEPCIONISTA } as unknown as import('@prisma/client').Utilizador);
      vi.mocked(prisma.utilizadorPermissao.findFirst).mockResolvedValue({ tipo: 'DENY' } as unknown as import('@prisma/client').UtilizadorPermissao);

      const result = await permissaoService.check(userId, recurso, accao);

      expect(result).toBe(false);
      expect(redis.set).toHaveBeenCalledWith(cacheKey, '0', 'EX', 3600);
    });

    it('deve permitir se role tiver permissão e não houver override', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: Papel.RECEPCIONISTA } as unknown as import('@prisma/client').Utilizador);
      vi.mocked(prisma.utilizadorPermissao.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.rolePermissao.findFirst).mockResolvedValue({ id: 'perm-1' } as unknown as import('@prisma/client').RolePermissao);

      const result = await permissaoService.check(userId, recurso, accao);

      expect(result).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(cacheKey, '1', 'EX', 3600);
    });

    it('deve negar se role não tiver permissão e não houver override', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: Papel.RECEPCIONISTA } as unknown as import('@prisma/client').Utilizador);
      vi.mocked(prisma.utilizadorPermissao.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.rolePermissao.findFirst).mockResolvedValue(null);

      const result = await permissaoService.check(userId, recurso, accao);

      expect(result).toBe(false);
      expect(redis.set).toHaveBeenCalledWith(cacheKey, '0', 'EX', 3600);
    });
  });

  describe('invalidateCache', () => {
    it('deve apagar todas as chaves do utilizador no redis', async () => {
      const keys = [`perm:${userId}:fatura:read`, `perm:${userId}:paciente:create`];
      vi.mocked(redis.keys).mockResolvedValue(keys);

      await permissaoService.invalidateCache(userId);

      expect(redis.keys).toHaveBeenCalledWith(`perm:${userId}:*`);
      expect(redis.del).toHaveBeenCalledWith(...keys);
    });

    it('não deve chamar del se não houver chaves', async () => {
      vi.mocked(redis.keys).mockResolvedValue([]);

      await permissaoService.invalidateCache(userId);

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
