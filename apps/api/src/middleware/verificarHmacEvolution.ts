import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '../lib/AppError';
import { config } from '../lib/config';

/**
 * Middleware para verificar a assinatura HMAC da Evolution API.
 */
export const verificarHmacEvolution = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const secret = config.EVOLUTION_WEBHOOK_SECRET;
  
  // Se não houver secret configurado, permite passar em ambiente de desenvolvimento
  if (!secret) {
    if (config.NODE_ENV === 'production') {
      return next(new AppError('Configuração de segurança em falta (EVOLUTION_WEBHOOK_SECRET)', 500));
    }
    return next();
  }

  const assinatura = req.headers['x-evolution-signature'] as string;

  if (!assinatura) {
    return next(new AppError('Assinatura ausente', 401, 'WEBHOOK_NO_SIGNATURE'));
  }

  try {
    const hmac = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Protecção timingSafeEqual para evitar ataques de tempo
    const signatureBuffer = Buffer.from(assinatura, 'hex');
    const hmacBuffer = Buffer.from(hmac, 'hex');

    if (signatureBuffer.length !== hmacBuffer.length || !crypto.timingSafeEqual(signatureBuffer, hmacBuffer)) {
      return next(new AppError('Assinatura HMAC inválida', 401, 'INVALID_SIGNATURE'));
    }

    next();
  } catch {
    next(new AppError('Falha na validação da assinatura', 401, 'VALIDATION_FAILED'));
  }
};
