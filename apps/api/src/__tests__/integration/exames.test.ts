import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/exames', () => {
  let ctx: any;
  let prontuarioId: string;
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
    it('creates an exame request', async () => {
      // Actually we need a Prontuario first or we can attach to agendamento?
      // exames.service says agendamentoId is optional, pacienteId is required

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

  describe('GET /api/exames/paciente/:id', () => {
    it('returns the list of exames for the patient', async () => {
      const res = await request
        .get(`/api/exames/paciente/${ctx.paciente.id}`)
        .set('Authorization', `Bearer ${ctx.medicoToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});

