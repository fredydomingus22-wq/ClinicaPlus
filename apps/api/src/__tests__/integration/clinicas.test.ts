import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/clinicas', () => {
  let ctx: any;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('GET /api/clinicas/me', () => {
    it('returns the clinca details for the authenticated user', async () => {
      const res = await request
        .get('/api/clinicas/me')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ctx.clinica.id);
      expect(res.body.data.nome).toBe(ctx.clinica.nome);
    });

    it('returns 401 unauthenticated', async () => {
      const res = await request.get('/api/clinicas/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/clinicas/me', () => {
    it('updates configuration for the clinica', async () => {
      const res = await request
        .patch('/api/clinicas/me')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          configuracao: {
            lembrete24h: false,
            lembrete2h: true
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.configuracao.lembrete24h).toBe(false);
      expect(res.body.data.configuracao.lembrete2h).toBe(true);
    });

    it('prevents non-admins from updating configuration', async () => {
      const res = await request
        .patch('/api/clinicas/me')
        .set('Authorization', `Bearer ${ctx.medicoToken}`)
        .send({ configuracao: { lembrete24h: false } });
      
      expect(res.status).toBe(403);
    });
  });
});

