import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { verificarHmacEvolution } from './verificarHmacEvolution';
import crypto from 'crypto';

describe('verificarHmacEvolution middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const nextFunction: NextFunction = vi.fn();
  const secret = 'test-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EVOLUTION_WEBHOOK_SECRET = secret;
    mockReq = {
      headers: {},
      body: { event: 'test.event' }
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('deve rejeitar payload sem assinatura HMAC', async () => {
    await verificarHmacEvolution(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ 
      error: expect.stringContaining('Assinatura ausente') 
    }));
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('deve rejeitar payload com assinatura HMAC inválida', async () => {
    mockReq.headers!['x-evolution-signature'] = 'invalid-hmac';

    await verificarHmacEvolution(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ 
      error: expect.stringContaining('Assinatura inválida') 
    }));
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('deve aceitar payload com assinatura HMAC válida', async () => {
    const payload = JSON.stringify(mockReq.body);
    const validHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    mockReq.headers!['x-evolution-signature'] = validHmac;

    await verificarHmacEvolution(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('deve permitir acesso se EVOLUTION_WEBHOOK_SECRET não estiver definido (fallback)', async () => {
    delete process.env.EVOLUTION_WEBHOOK_SECRET;
    
    await verificarHmacEvolution(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });
});
