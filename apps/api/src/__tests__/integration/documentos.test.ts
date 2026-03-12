import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('/api/documentos', () => {
  let ctx: any;
  let agendamentoId: string;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();

    const resAg = await request
      .post('/api/agendamentos')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({
        pacienteId: ctx.paciente.id,
        medicoId: ctx.medico.id,
        dataHora: new Date(Date.now() + 86400000).toISOString(),
        tipoConsulta: 'PRIMEIRA_VEZ',
        duracao: 30,
        observacoes: 'Teste documento',
        origem: 'LOCAL'
      });
      
    agendamentoId = resAg.body.data.id;
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  describe('POST /api/documentos', () => {
    it('generates a clinical document', async () => {
      const res = await request
        .post('/api/documentos')
        .set('Authorization', `Bearer ${ctx.medicoToken}`)
        .send({
          pacienteId: ctx.paciente.id,
          medicoId: ctx.medico.id,
          agendamentoId: agendamentoId,
          tipo: 'RELATORIO_MEDICO',
          nome: 'Atestado Médico',
          url: 'https://example.com/atestado.pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.nome).toBe('Atestado Médico');
    });
  });

  describe('GET /api/documentos/paciente/:id', () => {
    it('returns the documents for a patient', async () => {
      const res = await request
        .get(`/api/documentos/paciente/${ctx.paciente.id}`)
        .set('Authorization', `Bearer ${ctx.medicoToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});

