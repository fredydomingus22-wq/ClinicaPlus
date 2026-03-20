import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/exames', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;
  let agendamentoId: string;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();

    // Need to create an agendamento to associate things with
    const resAg = await request
      .post('/api/agendamentos')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({
        pacienteId: ctx.paciente.id,
        medicoId: ctx.medico.id,
        dataHora: new Date(Date.now() + 86400000).toISOString(),
        tipoConsulta: 'PRIMEIRA_VEZ',
        duracao: 30,
        observacoes: 'Teste exame',
        origem: 'LOCAL'
      });

    agendamentoId = resAg.body.data.id;
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('POST /api/exames', () => {
    it('deve requerer autenticacao', async () => {
      await request
        .post('/api/exames')
        .send(factories.createExameData('dummy'))
        .expect(401);
    });

    it('deve criar um exame fisico (Médico)', async () => {
      const res = await request
        .post('/api/exames')
        .set('Authorization', `Bearer ${ctx.medicoToken}`)
        .send(factories.createExameData(ctx.paciente.id, agendamentoId, ctx.medico.id));

      expect(res.status).toBe(201);
      expect(res.body.nome).toBe('Exame Físico');
    });

    it('creates an exame request', async () => {
      const res = await request
        .post('/api/exames')
        .set('Authorization', `Bearer ${ctx.medicoToken}`)
        .send({
          pacienteId: ctx.paciente.id,
          medicoId: ctx.medico.id,
          agendamentoId: agendamentoId,
          tipo: 'LABORATORIO',
          nome: 'Hemograma Completo'
        });

      expect(res.status).toBe(201);
      expect(res.body.nome).toBe('Hemograma Completo');
    });
  });

  describe('GET /api/exames', () => {
    it('deve listar exames do paciente com filtros', async () => {
      const res = await request
        .get(`/api/exames?pacienteId=${ctx.paciente.id}&status=REALIZADO`)
        .set('Authorization', `Bearer ${ctx.medicoToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].status).toBe('REALIZADO');
    });

    it('deve rejeitar sem pacienteId', async () => {
      await request
        .get('/api/exames')
        .set('Authorization', `Bearer ${ctx.medicoToken}`)
        .expect(400);
    });
  });
});
