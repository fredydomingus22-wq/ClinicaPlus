import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/equipa', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('GET /api/equipa', () => {
    it('returns a list of team members for the clinica', async () => {
      const res = await request
        .get('/api/equipa')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/equipa', () => {
    it('creates a new team member', async () => {
      const res = await request
        .post('/api/equipa')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          nome: 'Novo Recepcionista',
          email: `recepcionista-${Date.now()}@teste.com`,
          papel: 'RECEPCIONISTA',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.nome).toBe('Novo Recepcionista');
    });
  });
});

