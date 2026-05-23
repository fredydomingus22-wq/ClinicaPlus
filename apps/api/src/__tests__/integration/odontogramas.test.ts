import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
import { factories } from '../helpers/factories';
import { DenteFace, DenteStatus } from '@clinicaplus/types';

const request = createTestApp();

describe('/api/odontogramas', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;
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
        duracao: 30,
        observacoes: 'Consulta odontograma test',
      });

    agendamentoId = resAg.body.data?.id ?? resAg.body.id;
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  it('deve criar e obter odontograma por agendamento com marcação de cárie', async () => {
    const marcacoes = [
      { numeroDente: 16, face: DenteFace.O, status: DenteStatus.CARIE, observacao: 'Oclusal' },
    ];

    const createRes = await request
      .post('/api/odontogramas')
      .set('Authorization', `Bearer ${ctx.medicoToken}`)
      .send({
        agendamentoId,
        pacienteId: ctx.paciente.id,
        medicoId: ctx.medico.id,
        marcacoes,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.marcacoes).toEqual(marcacoes);

    const getRes = await request
      .get(`/api/odontogramas/agendamento/${agendamentoId}`)
      .set('Authorization', `Bearer ${ctx.medicoToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.marcacoes[0].numeroDente).toBe(16);
    expect(getRes.body.marcacoes[0].status).toBe(DenteStatus.CARIE);
  });

  it('deve actualizar marcações via PATCH', async () => {
    const getRes = await request
      .get(`/api/odontogramas/agendamento/${agendamentoId}`)
      .set('Authorization', `Bearer ${ctx.medicoToken}`);

    const id = getRes.body.id;
    const marcacoes = [
      { numeroDente: 16, face: DenteFace.O, status: DenteStatus.TRATADO },
      { numeroDente: 11, face: DenteFace.G, status: DenteStatus.FRATURA },
    ];

    const patchRes = await request
      .patch(`/api/odontogramas/${id}`)
      .set('Authorization', `Bearer ${ctx.medicoToken}`)
      .send({ marcacoes });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.marcacoes).toHaveLength(2);
  });
});
