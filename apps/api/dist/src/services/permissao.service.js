"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissaoService = void 0;
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../lib/redis");
const client_1 = require("@prisma/client");
const AppError_1 = require("../lib/AppError");
exports.permissaoService = {
    /**
     * Verifica se um utilizador tem uma permissão específica.
     * Lógica: Cache Redis -> DB (Overrides Utilizador -> Matriz Role).
     */
    async check(userId, recurso, accao) {
        const codigo = `${recurso}:${accao}`;
        const cacheKey = `perm:${userId}:${codigo}`;
        // 1. Tentar cache Redis
        const cached = await redis_1.redis.get(cacheKey);
        if (cached !== null) {
            return cached === '1';
        }
        // 2. Buscar utilizador e o seu papel
        const utilizador = await prisma_1.prisma.utilizador.findUnique({
            where: { id: userId },
            select: { id: true, papel: true }
        });
        if (!utilizador)
            return false;
        // SUPER_ADMIN e ADMIN têm bypass total (no caso do ADMIN, restrito pela clínica via Tenant Middleware)
        if (utilizador.papel === client_1.Papel.SUPER_ADMIN || utilizador.papel === client_1.Papel.ADMIN) {
            await redis_1.redis.set(cacheKey, '1', 'EX', 3600);
            return true;
        }
        // 3. Verificar Override específico do utilizador (GRANT/DENY)
        const override = await prisma_1.prisma.utilizadorPermissao.findFirst({
            where: {
                utilizadorId: userId,
                permissao: { codigo }
            }
        });
        if (override) {
            const allowed = override.tipo === 'GRANT';
            await redis_1.redis.set(cacheKey, allowed ? '1' : '0', 'EX', 3600);
            return allowed;
        }
        // 4. Verificar Matriz da Role
        const rolePerm = await prisma_1.prisma.rolePermissao.findFirst({
            where: {
                papel: utilizador.papel,
                permissao: { codigo }
            }
        });
        const allowed = !!rolePerm;
        await redis_1.redis.set(cacheKey, allowed ? '1' : '0', 'EX', 3600);
        return allowed;
    },
    /**
     * Lança erro se o utilizador não tiver a permissão.
     */
    async requirePermission(userId, recurso, accao) {
        const allowed = await this.check(userId, recurso, accao);
        if (!allowed) {
            throw new AppError_1.AppError(`Sem permissão para ${recurso}:${accao}`, 403, 'FORBIDDEN');
        }
    },
    /**
     * Invalida o cache de permissões do utilizador.
     */
    async invalidateCache(userId) {
        const keys = await redis_1.redis.keys(`perm:${userId}:*`);
        if (keys && keys.length > 0) {
            await redis_1.redis.del(...keys);
        }
    }
};
