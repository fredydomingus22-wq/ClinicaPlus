import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { Papel, EscopoApiKey } from '@prisma/client';
import { Clinica, ConfiguracaoClinica } from '@prisma/client';

/**
 * Middleware de autenticação por API Key.
 * Valida a chave, verifica limites do plano e aplica Rate Limiting.
 */
export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (!apiKeyHeader) {
    return next(new AppError('API Key é obrigatória no header X-Api-Key', 401, 'API_KEY_REQUIRED'));
  }

  // 1. Validar formato (opcional, mas bom para performance)
  if (!apiKeyHeader.startsWith('cp_live_')) {
    return next(new AppError('Formato de API Key inválido', 401, 'INVALID_API_KEY'));
  }

  try {
    // 2. Hashar para lookup (NUNCA buscar o token direto se possível, mas aqui o hash é o index)
    const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        clinica: {
          include: { configuracao: true }
        }
      }
    });

    if (!apiKey || !apiKey.ativo) {
      return next(new AppError('API Key inválida ou inativa', 401, 'INVALID_API_KEY'));
    }

    // 3. Verificar expiração
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return next(new AppError('API Key expirada', 401, 'API_KEY_EXPIRED'));
    }

    // 4. Rate Limiting (Sliding Window em Redis)
    const hourlyLimit = apiKey.clinica.plano === 'ENTERPRISE' ? 5000 : 500;
    const keyPrefix = `ratelimit:apikey:${apiKey.id}:${Math.floor(Date.now() / 3600000)}`; // Janela de 1 hora
    
    // Incrementar e definir expiração se novo
    const currentRequests = await redis.incr(keyPrefix);
    if (currentRequests === 1) {
      await redis.expire(keyPrefix, 3600);
    }

    if (currentRequests > hourlyLimit) {
      return next(new AppError('Limite de requisições excedido. Tente novamente mais tarde.', 429, 'RATE_LIMIT_EXCEEDED'));
    }

    // 5. Atualizar último uso (assíncrono, não bloqueia)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { ultimoUso: new Date() }
    }).catch(err => logger.error('Erro ao atualizar último uso da API Key:', err));

    // 6. Popular contexto (compatível com authenticate/tenantMiddleware)
    req.user = {
      id: `apikey:${apiKey.id}`,
      clinicaId: apiKey.clinicaId,
      papel: 'ADMIN' as Papel,
      isApiKey: true,
      escopos: apiKey.escopos as EscopoApiKey[]
    };

    req.clinica = apiKey.clinica as Clinica & { configuracao: ConfiguracaoClinica };

    next();
  } catch (err) {
    next(err);
  }
}
