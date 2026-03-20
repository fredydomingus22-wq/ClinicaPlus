import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware para verificar a assinatura HMAC da Evolution API.
 */
export const verificarHmacEvolution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  
  // Se não houver secret configurado, permite passar (em dev/test ou se desativado)
  if (!secret) {
    return next();
  }

  const assinatura = req.headers['x-evolution-signature'] as string;

  if (!assinatura) {
    res.status(401).json({ error: 'Assinatura ausente' });
    return;
  }

  const hmac = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hmac !== assinatura) {
    res.status(401).json({ error: 'Assinatura inválida' });
    return;
  }

  next();
};
