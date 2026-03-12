import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/medicos', () => {
  let ctx: any;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('GET /api/medicos', () => {
    it('returns a list of medicos for the clinica', async () => {
      const res = await request
        .get('/api/medicos')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0].nome).toBe(ctx.medico.nome);
    });
  });

  describe('GET /api/medicos/:id', () => {
    it('returns specific medico details', async () => {
      const res = await request
        .get(`/api/medicos/${ctx.medico.id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ctx.medico.id);
    });
  });

  describe('PATCH /api/medicos/:id', () => {
    it('updates a medico details and permissions', async () => {
      const res = await request
        .patch(`/api/medicos/${ctx.medico.id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          duracaoConsulta: 45,
          preco: 5000
        });

      expect(res.status).toBe(200);
      expect(res.body.data.duracaoConsulta).toBe(45);
      expect(res.body.data.preco).toBe(5000);
    });
  });

  describe('GET /api/medicos/:id/slots', () => {
    it('returns available slots for a medico on a specific date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request
        .get(`/api/medicos/${ctx.medico.id}/slots?data=${today}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slots).toBeInstanceOf(Array);
    });

    it('returns 400 for invalid date format', async () => {
      const res = await request
        .get(`/api/medicos/${ctx.medico.id}/slots?data=invalid-date`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Permissions', () => {
    it('POST /api/medicos as RECEPCIONISTA -> 403', async () => {
      const res = await request
        .post('/api/medicos')
        .set('Authorization', `Bearer ${ctx.recepcaoToken}`)
        .send({
          nome: 'Novo Medico',
          especialidadeId: ctx.medico.especialidadeId,
          utilizadorId: ctx.admin.id, // Dummy
          horario: {},
        });

      expect(res.status).toBe(403);
    });

    it('PATCH /api/medicos/:id as RECEPCIONISTA -> 403', async () => {
      const res = await request
        .patch(`/api/medicos/${ctx.medico.id}`)
        .set('Authorization', `Bearer ${ctx.recepcaoToken}`)
        .send({ preco: 9999 });

      expect(res.status).toBe(403);
    });
  });
});

