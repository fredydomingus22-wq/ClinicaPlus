import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/prontuarios', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;
  let agendamentoId: string;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();

    // Create an agendamento
    const resAg = await request
      .post('/api/agendamentos')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({
        pacienteId: ctx.paciente.id,
        medicoId: ctx.medico.id,
        dataHora: new Date(Date.now() + 86400000).toISOString(),
        tipoConsulta: 'PRIMEIRA_VEZ',
        duracao: 30,
        observacoes: 'Teste prontuario',
        origem: 'LOCAL'
      });
      
    agendamentoId = resAg.body.data.id;
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('POST /api/prontuarios', () => {
    it('creates a clinical record (prontuario)', async () => {
      const res = await request
        .post('/api/prontuarios')
        .set('Authorization', `Bearer ${ctx.medicoToken}`)
        .send({
          pacienteId: ctx.paciente.id,
          medicoId: ctx.medico.id,
          agendamentoId: agendamentoId,
          tipo: 'EVOLUCAO',
          notas: 'O paciente apresentou melhoras.',
          diagnostico: 'Gripe'
        });

      expect(res.status).toBe(201);
      expect(res.body.data ? res.body.data.notas : res.body.notas).toBe('O paciente apresentou melhoras.');
    });
  });

  describe('GET /api/prontuarios/paciente/:id', () => {
    it('returns the history of records for a patient', async () => {
      const res = await request
        .get(`/api/prontuarios/paciente/${ctx.paciente.id}`)
        .set('Authorization', `Bearer ${ctx.medicoToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });
});

