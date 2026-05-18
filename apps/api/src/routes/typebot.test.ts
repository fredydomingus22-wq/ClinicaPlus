import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { prisma } from '../lib/prisma';
import { config } from '../lib/config';

// Mocks
vi.mock('../lib/prisma', () => ({
  prisma: {
    waInstancia: {
      findFirst: vi.fn(),
    },
  },
}));

// Evitar bloqueio de Redis e Socket IO local durante o supertest
vi.mock('../lib/redis', () => ({
  redis: { ping: vi.fn().mockResolvedValue('PONG'), quit: vi.fn() },
  redisSub: { quit: vi.fn() }
}));

vi.mock('../lib/socket', () => ({
  setupSocket: vi.fn()
}));

describe('Typebot Webhooks Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/typebot/agendamento', () => {
    it('deve retornar 401 se x-typebot-secret não for fornecido', async () => {
      const res = await request(app)
        .post('/api/typebot/agendamento')
        .send({ evolutionInstance: 'test-inst' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Acesso não autorizado');
    });

    it('deve retornar 400 se evolutionInstance não for fornecido', async () => {
      const res = await request(app)
        .post('/api/typebot/agendamento')
        .set('x-typebot-secret', config.JWT_SECRET)
        .send({ foo: 'bar' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Instance name não fornecida');
    });

    it('deve retornar 404 se a instância não for encontrada na base de dados', async () => {
      vi.mocked(prisma.waInstancia.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/typebot/agendamento')
        .set('x-typebot-secret', config.JWT_SECRET)
        .send({ evolutionInstance: 'invalid-inst' });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Instância não encontrada ou desvinculada');
    });

    it('deve retornar 200 e processar payload se a instância existir na db', async () => {
      vi.mocked(prisma.waInstancia.findFirst).mockResolvedValue({
        id: 'inst-1',
        clinicaId: 'clinica-123',
        evolutionName: 'valid-inst',
      } as any);

      const res = await request(app)
        .post('/api/typebot/agendamento')
        .set('x-typebot-secret', config.JWT_SECRET)
        .send({ evolutionInstance: 'valid-inst', info: 'extra data' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Webhook Agendamento processado com sucesso');
    });
  });
});
