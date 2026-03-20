import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { waInstanciaService } from '../../services/wa-instancia.service';
import { waWebhookService } from '../../services/wa-webhook.service';

// Mock dos serviços
vi.mock('../../services/wa-instancia.service', () => ({
  waInstanciaService: {
    criar: vi.fn(),
    obterQrCode: vi.fn(),
    estado: vi.fn(),
    desconectar: vi.fn(),
  }
}));

// helper removed as it was unused and causing lint errors

vi.mock('../../services/wa-webhook.service', () => ({
  waWebhookService: {
    processarEvento: vi.fn(),
  }
}));

// Mock do middleware de autenticação (para simplificar os testes de integração)
vi.mock('../../middleware/authenticate', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking request and response
  authenticate: (req: any, _res: any, next: any): void => {
    req.user = { id: 'user-1' };
    next();
  }
}));

vi.mock('../../middleware/tenant', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking request and response
  tenantMiddleware: (req: any, _res: any, next: any): void => {
    req.clinica = { id: 'clinica-1' };
    next();
  }
}));

describe('WhatsApp Routes (Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/whatsapp/instancia', () => {
    it('deve criar uma instância e retornar 200', async () => {
      const mockInstancia = { id: 'inst-1', evolutionName: 'cp-test' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Casting vi.fn to any for mockResolvedValue
      (waInstanciaService.criar as any).mockResolvedValue(mockInstancia);

      const response = await request(app)
        .post('/api/whatsapp/instancia')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockInstancia);
      expect(waInstanciaService.criar).toHaveBeenCalledWith('clinica-1');
    });
  });

  describe('POST /api/whatsapp/webhook', () => {
    it('deve processar o webhook e retornar 200', async () => {
      const payload = { event: 'connection.update', data: {} };
      const signature = 'valid-sig';

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-evolution-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
      expect(waWebhookService.processarEvento).toHaveBeenCalledWith(payload, signature);
    });
  });
});
