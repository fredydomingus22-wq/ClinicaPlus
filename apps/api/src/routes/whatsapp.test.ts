import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import whatsappRouter from './whatsapp';
import { waInstanciaService } from '../services/wa-instancia.service';
import { waAutomacaoService } from '../services/wa-automacao.service';

import { Papel, Plano, Clinica } from '@prisma/client';

// Mock dos Middlewares (necessário para o router não quebrar nas definições)
interface MockRequest extends Request {
  user: Express.Request['user'];
  clinica: Express.Request['clinica'];
}

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction): void => {
    (req as MockRequest).user = { id: 'user-1', papel: Papel.ADMIN, clinicaId: 'clinica-1' };
    next();
  }
}));

vi.mock('../middleware/tenant', () => ({
  tenantMiddleware: (req: Request, _res: Response, next: NextFunction): void => {
    (req as MockRequest).clinica = { id: 'clinica-1', plano: Plano.PRO } as unknown as Clinica & { configuracao?: unknown };
    next();
  }
}));

vi.mock('../middleware/requirePlan', () => ({
  requirePlan: () => (_req: Request, _res: Response, next: NextFunction): void => next()
}));

vi.mock('../middleware/requireRole', () => ({
  requireRole: () => (_req: Request, _res: Response, next: NextFunction): void => next()
}));

vi.mock('../middleware/requirePermission', () => ({
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction): void => next()
}));

vi.mock('../middleware/apiKeyAuth', () => ({
  apiKeyAuth: (req: Request, _res: Response, next: NextFunction): void => {
    (req as MockRequest).clinica = { id: 'clinica-1' } as unknown as Clinica & { configuracao?: unknown };
    next();
  }
}));

vi.mock('../middleware/verificarHmacEvolution', () => ({
  verificarHmacEvolution: (_req: Request, _res: Response, next: NextFunction): void => next()
}));

vi.mock('../services/wa-instancia.service', () => ({
  waInstanciaService: {
    criar: vi.fn(),
    obterQrCode: vi.fn(),
    getInstanciaOrThrow: vi.fn(),
    desligar: vi.fn()
  }
}));

vi.mock('../services/wa-automacao.service', () => ({
  waAutomacaoService: {
    listar: vi.fn(),
    activar: vi.fn(),
    desactivar: vi.fn(),
    configurar: vi.fn()
  }
}));

vi.mock('../services/wa-conversa.service', () => ({
  waConversaService: {
    listarActivas: vi.fn()
  }
}));

vi.mock('../services/wa-webhook.service', () => ({
  waWebhookService: {
    processarEvento: vi.fn()
  }
}));

const app = express();
app.use(express.json());

// Injeção de contexto (simula authenticate + tenantMiddleware)
app.use((req, _res, next) => {
  const mockReq = req as MockRequest;
  mockReq.user = { id: 'user-1', papel: Papel.ADMIN, clinicaId: 'clinica-1' };
  mockReq.clinica = { id: 'clinica-1', plano: Plano.PRO } as unknown as Clinica & { configuracao?: unknown };
  next();
});

app.use('/api/whatsapp', whatsappRouter);

describe('WhatsApp Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Gestão de Instância', () => {
    it('POST /api/whatsapp/instancias deve criar instância', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(waInstanciaService.criar).mockResolvedValue({ id: 'inst-1', evolutionName: 'evo-1', evolutionToken: 'tok-1' } as any);

      const res = await request(app).post('/api/whatsapp/instancias');

      expect(res.status).toBe(201);
      expect(waInstanciaService.criar).toHaveBeenCalled();
    });

    it('GET /api/whatsapp/instancias/qrcode deve obter QR code', async () => {
      vi.mocked(waInstanciaService.obterQrCode).mockResolvedValue({ qrcode: 'base64' });

      const res = await request(app).get('/api/whatsapp/instancias/qrcode');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ qrcode: 'base64' });
    });

    it('GET /api/whatsapp/instancias/estado deve retornar estado', async () => {
      vi.mocked(waInstanciaService.getInstanciaOrThrow).mockResolvedValue({ 
        estado: 'CONECTADO', 
        numeroTelefone: '123',
        id: 'inst-1',
        clinicaId: 'clinica-1',
        evolutionName: 'evo-1',
        evolutionToken: 'tok-1',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrCodeBase64: null
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- Mocked result for service call

      const res = await request(app).get('/api/whatsapp/instancias/estado');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('estado', 'CONECTADO');
    });

    it('DELETE /api/whatsapp/instancias deve desligar instância', async () => {
      vi.mocked(waInstanciaService.desligar).mockResolvedValue();

      const res = await request(app).delete('/api/whatsapp/instancias');

      expect(res.status).toBe(200);
      expect(waInstanciaService.desligar).toHaveBeenCalled();
    });
  });

  describe('Gestão de Automações', () => {
    it('GET /api/whatsapp/automacoes deve listar automações', async () => {
      vi.mocked(waAutomacaoService.listar).mockResolvedValue([]);

      const res = await request(app).get('/api/whatsapp/automacoes');

      expect(res.status).toBe(200);
      expect(waAutomacaoService.listar).toHaveBeenCalled();
    });

    it('PATCH /api/whatsapp/automacoes/:id deve atualizar configuração', async () => {
      const res = await request(app).patch('/api/whatsapp/automacoes/123').send({ config: {} });
      expect(res.status).toBe(200);
    });

    it('POST /api/whatsapp/automacoes/:id/activar deve activar automação', async () => {
      vi.mocked(waAutomacaoService.activar).mockResolvedValue();

      const res = await request(app).post('/api/whatsapp/automacoes/123/activar');

      expect(res.status).toBe(200);
      expect(waAutomacaoService.activar).toHaveBeenCalled();
    });
  });

  describe('Endpoints de Fluxo (API Key Auth)', () => {
    it('POST /api/whatsapp/fluxo/inicio deve retornar 200', async () => {
      const res = await request(app).post('/api/whatsapp/fluxo/inicio');
      expect(res.status).toBe(200);
    });

    it('GET /api/whatsapp/fluxo/conversa deve retornar estado da conversa', async () => {
      const res = await request(app).get('/api/whatsapp/fluxo/conversa');
      expect(res.status).toBe(200);
    });
  });

  describe('Atividade e Relatórios', () => {
    it('GET /api/whatsapp/actividade deve retornar últimas ações', async () => {
      const res = await request(app).get('/api/whatsapp/actividade');
      expect(res.status).toBe(200);
    });

    it('GET /api/whatsapp/conversas deve listar conversas ativas', async () => {
      const res = await request(app).get('/api/whatsapp/conversas');
      expect(res.status).toBe(200);
    });
  });
});
