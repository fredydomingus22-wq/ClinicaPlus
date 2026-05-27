"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const permissao_service_1 = require("../../services/permissao.service");
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const client_1 = require("@prisma/client");
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        utilizador: { findUnique: vitest_1.vi.fn() },
        utilizadorPermissao: { findFirst: vitest_1.vi.fn() },
        rolePermissao: { findFirst: vitest_1.vi.fn() },
    },
}));
vitest_1.vi.mock('../../lib/redis', () => ({
    redis: {
        get: vitest_1.vi.fn(),
        set: vitest_1.vi.fn(),
        keys: vitest_1.vi.fn(),
        del: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('permissaoService', () => {
    const userId = 'user-123';
    const recurso = 'fatura';
    const accao = 'create';
    const codigo = 'fatura:create';
    const cacheKey = `perm:${userId}:${codigo}`;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('check', () => {
        (0, vitest_1.it)('deve retornar true se estiver no cache Redis', async () => {
            vitest_1.vi.mocked(redis_1.redis.get).mockResolvedValue('1');
            const result = await permissao_service_1.permissaoService.check(userId, recurso, accao);
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(redis_1.redis.get).toHaveBeenCalledWith(cacheKey);
            (0, vitest_1.expect)(prisma_1.prisma.utilizador.findUnique).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('deve retornar false se estiver no cache Redis como negado', async () => {
            vitest_1.vi.mocked(redis_1.redis.get).mockResolvedValue('0');
            const result = await permissao_service_1.permissaoService.check(userId, recurso, accao);
            (0, vitest_1.expect)(result).toBe(false);
            (0, vitest_1.expect)(redis_1.redis.get).toHaveBeenCalledWith(cacheKey);
        });
        (0, vitest_1.it)('deve permitir bypass total para SUPER_ADMIN', async () => {
            vitest_1.vi.mocked(redis_1.redis.get).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: client_1.Papel.SUPER_ADMIN });
            const result = await permissao_service_1.permissaoService.check(userId, recurso, accao);
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(redis_1.redis.set).toHaveBeenCalledWith(cacheKey, '1', 'EX', 3600);
        });
        (0, vitest_1.it)('deve respeitar override GRANT do utilizador', async () => {
            vitest_1.vi.mocked(redis_1.redis.get).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: client_1.Papel.RECEPCIONISTA });
            vitest_1.vi.mocked(prisma_1.prisma.utilizadorPermissao.findFirst).mockResolvedValue({ tipo: 'GRANT' });
            const result = await permissao_service_1.permissaoService.check(userId, recurso, accao);
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(redis_1.redis.set).toHaveBeenCalledWith(cacheKey, '1', 'EX', 3600);
            (0, vitest_1.expect)(prisma_1.prisma.rolePermissao.findFirst).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('deve respeitar override DENY do utilizador mesmo que role permita', async () => {
            vitest_1.vi.mocked(redis_1.redis.get).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: client_1.Papel.RECEPCIONISTA });
            vitest_1.vi.mocked(prisma_1.prisma.utilizadorPermissao.findFirst).mockResolvedValue({ tipo: 'DENY' });
            const result = await permissao_service_1.permissaoService.check(userId, recurso, accao);
            (0, vitest_1.expect)(result).toBe(false);
            (0, vitest_1.expect)(redis_1.redis.set).toHaveBeenCalledWith(cacheKey, '0', 'EX', 3600);
        });
        (0, vitest_1.it)('deve permitir se role tiver permissão e não houver override', async () => {
            vitest_1.vi.mocked(redis_1.redis.get).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: client_1.Papel.RECEPCIONISTA });
            vitest_1.vi.mocked(prisma_1.prisma.utilizadorPermissao.findFirst).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.rolePermissao.findFirst).mockResolvedValue({ id: 'perm-1' });
            const result = await permissao_service_1.permissaoService.check(userId, recurso, accao);
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(redis_1.redis.set).toHaveBeenCalledWith(cacheKey, '1', 'EX', 3600);
        });
        (0, vitest_1.it)('deve negar se role não tiver permissão e não houver override', async () => {
            vitest_1.vi.mocked(redis_1.redis.get).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue({ id: userId, papel: client_1.Papel.RECEPCIONISTA });
            vitest_1.vi.mocked(prisma_1.prisma.utilizadorPermissao.findFirst).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.rolePermissao.findFirst).mockResolvedValue(null);
            const result = await permissao_service_1.permissaoService.check(userId, recurso, accao);
            (0, vitest_1.expect)(result).toBe(false);
            (0, vitest_1.expect)(redis_1.redis.set).toHaveBeenCalledWith(cacheKey, '0', 'EX', 3600);
        });
    });
    (0, vitest_1.describe)('invalidateCache', () => {
        (0, vitest_1.it)('deve apagar todas as chaves do utilizador no redis', async () => {
            const keys = [`perm:${userId}:fatura:read`, `perm:${userId}:paciente:create`];
            vitest_1.vi.mocked(redis_1.redis.keys).mockResolvedValue(keys);
            await permissao_service_1.permissaoService.invalidateCache(userId);
            (0, vitest_1.expect)(redis_1.redis.keys).toHaveBeenCalledWith(`perm:${userId}:*`);
            (0, vitest_1.expect)(redis_1.redis.del).toHaveBeenCalledWith(...keys);
        });
        (0, vitest_1.it)('não deve chamar del se não houver chaves', async () => {
            vitest_1.vi.mocked(redis_1.redis.keys).mockResolvedValue([]);
            await permissao_service_1.permissaoService.invalidateCache(userId);
            (0, vitest_1.expect)(redis_1.redis.del).not.toHaveBeenCalled();
        });
    });
});
