import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import crypto from 'crypto';

/**
 * Middleware para autenticação via API Key (Headers: X-API-KEY).
 * Usado principalmente para integração com n8n.
 */
export const apiKeyAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(new AppError('API Key ausente (Header X-API-KEY)', 401, 'API_KEY_MISSING'));
  }

  try {
    const [prefixo, rawKey] = apiKey.split('.');
    
    if (!prefixo || !rawKey) {
      return next(new AppError('Formato de API Key inválido', 401, 'API_KEY_INVALID_FORMAT'));
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { clinica: true }
    });

    if (!keyRecord || !keyRecord.ativo) {
      return next(new AppError('API Key inválida ou desactivada', 401, 'API_KEY_INVALID'));
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return next(new AppError('API Key expirada', 401, 'API_KEY_EXPIRED'));
    }

    // Inject clinica and scopes into request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).clinica = {
      id: keyRecord.clinicaId,
      slug: keyRecord.clinica.slug,
      plano: keyRecord.clinica.plano
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).apiScopes = keyRecord.escopos;

    // Actualizar último uso (background)
    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { ultimoUso: new Date() }
    }).catch(() => {});

    next();
  } catch {
    next(new AppError('Falha na autenticação da API Key', 401, 'API_KEY_AUTH_FAILED'));
  }
};

/**
 * Middleware para verificar escopos da API Key.
 */
export const requireScope = (scope: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const scopes = (req as Request & { apiScopes?: string[] }).apiScopes || [];
    
    if (!scopes.includes(scope)) {
      return next(new AppError(`Escopo necessário ausente: ${scope}`, 403, 'INSUFFICIENT_SCOPE'));
    }
    
    next();
  };
};
