import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { AppError } from '../lib/AppError';
import { Papel } from '@prisma/client';

interface JwtPayload {
  sub: string;
  clinicaId: string;
  papel: Papel;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Não autenticado', 401, 'UNAUTHENTICATED'));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    
    req.user = {
      id: payload.sub,
      clinicaId: payload.clinicaId,
      papel: payload.papel,
    };
    
    next();
  } catch (err) {
    next(new AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN'));
  }
}
