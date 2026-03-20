import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { Papel } from '@prisma/client';
import { AppError } from '../lib/AppError';

export const permissaoService = {
  /**
   * Verifica se um utilizador tem uma permissão específica.
   * Lógica: Cache Redis -> DB (Overrides Utilizador -> Matriz Role).
   */
  async check(userId: string, recurso: string, accao: string): Promise<boolean> {
    const codigo = `${recurso}:${accao}`;
    const cacheKey = `perm:${userId}:${codigo}`;

    // 1. Tentar cache Redis
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }

    // 2. Buscar utilizador e o seu papel
    const utilizador = await prisma.utilizador.findUnique({
      where: { id: userId },
      select: { id: true, papel: true }
    });

    if (!utilizador) return false;

    // SUPER_ADMIN tem bypass total
    if (utilizador.papel === Papel.SUPER_ADMIN) {
      await redis.set(cacheKey, '1', 'EX', 3600);
      return true;
    }

    // 3. Verificar Override específico do utilizador (GRANT/DENY)
    const override = await prisma.utilizadorPermissao.findFirst({
      where: {
        utilizadorId: userId,
        permissao: { codigo }
      }
    });

    if (override) {
      const allowed = override.tipo === 'GRANT';
      await redis.set(cacheKey, allowed ? '1' : '0', 'EX', 3600);
      return allowed;
    }

    // 4. Verificar Matriz da Role
    const rolePerm = await prisma.rolePermissao.findFirst({
      where: {
        papel: utilizador.papel,
        permissao: { codigo }
      }
    });

    const allowed = !!rolePerm;
    await redis.set(cacheKey, allowed ? '1' : '0', 'EX', 3600);
    return allowed;
  },

  /**
   * Lança erro se o utilizador não tiver a permissão.
   */
  async requirePermission(userId: string, recurso: string, accao: string): Promise<void> {
    const allowed = await this.check(userId, recurso, accao);
    if (!allowed) {
      throw new AppError(`Sem permissão para ${recurso}:${accao}`, 403, 'FORBIDDEN');
    }
  },

  /**
   * Invalida o cache de permissões do utilizador.
   */
  async invalidateCache(userId: string): Promise<void> {
    const keys = await redis.keys(`perm:${userId}:*`);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  }
};
