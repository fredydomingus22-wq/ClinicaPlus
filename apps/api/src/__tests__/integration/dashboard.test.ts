import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/dashboard', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('GET /api/dashboard', () => {
    it('returns 200 and stats for Admin', async () => {
      const res = await request
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('returns 403 for unauthorized role', async () => {
      const res = await request
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${ctx.pacienteToken}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/dashboard/medico', () => {
    it('returns 200 and stats for Medico', async () => {
      const res = await request
        .get('/api/dashboard/medico')
        .set('Authorization', `Bearer ${ctx.medicoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });
});

