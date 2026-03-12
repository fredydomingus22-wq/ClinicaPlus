import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/especialidades', () => {
  let ctx: any;
  let especialidadeId: string;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('POST /api/especialidades', () => {
    it('creates a new especialidade', async () => {
      const res = await request
        .post('/api/especialidades')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          nome: 'Cardiologia',
          descricao: 'Especialista do coraÃ§Ã£o'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.nome).toBe('Cardiologia');
      especialidadeId = res.body.data.id;
    });
  });

  describe('GET /api/especialidades', () => {
    it('returns a list of especialidades', async () => {
      const res = await request
        .get('/api/especialidades')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/especialidades/:id', () => {
    it('updates an especialidade', async () => {
      const res = await request
        .patch(`/api/especialidades/${especialidadeId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          nome: 'Cardiologia AvanÃ§ada'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.nome).toBe('Cardiologia AvanÃ§ada');
    });
  });
});

