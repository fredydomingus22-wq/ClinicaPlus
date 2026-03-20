import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/relatorios', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    if (ctx) await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('GET /api/relatorios/receita', () => {
    it('returns 200 and receita report data for Admin', async () => {
      const res = await request
        .get('/api/relatorios/receita')
        .query({
          inicio: '2026-02-28',
          fim: '2026-03-15',
          agrupamento: 'day'
        })
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totais).toBeDefined();
      expect(res.body.data.serie).toBeDefined();
    });

    it('returns 403 for non-Admin role', async () => {
      const res = await request
        .get('/api/relatorios/receita')
        .set('Authorization', `Bearer ${ctx.medicoToken}`);
      
      expect(res.status).toBe(403);
    });
  });
});
