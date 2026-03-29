import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { AppError } from '../lib/AppError';
import { Papel } from '@prisma/client';
import { prisma } from '../lib/prisma'; // Added for impersonation decoding

interface JwtPayload {
  sub: string;
  clinicaId: string;
  papel: Papel;
  isImpersonated?: boolean;
  impersonationId?: string;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Não autenticado', 401, 'UNAUTHENTICATED'));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    
    // Validar ativamente sessões de Impersonation na dB
    if (payload.isImpersonated && payload.impersonationId) {
      const session = await prisma.impersonationSession.findUnique({
        where: { id: payload.impersonationId }
      });
      if (!session || session.expiresAt < new Date()) {
        next(new AppError('Sessão de impersonation expirou ou não existe', 401, 'INVALID_TOKEN'));
        return;
      }
    }

    req.user = {
      id: payload.sub,
      clinicaId: payload.clinicaId,
      papel: payload.papel,
    };
    
    next();
  } catch {
    next(new AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN'));
  }
}
