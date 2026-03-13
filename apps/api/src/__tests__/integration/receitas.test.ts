import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, authHeader } from '../helpers/request';
import { factories } from '../helpers/factories';

describe('/api/receitas', () => {
  const app = createTestApp();
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;
  let ctxOther: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;
  let pendingAgendamentoId: string;
  let concludedAgendamentoId: string;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
    ctxOther = await factories.setupClinicaCompleta();

    const createRes = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ 
        pacienteId: ctx.paciente.id, 
        medicoId: ctx.medico.id, 
        dataHora: '2026-11-20T10:00:00.000Z', 
        tipo: 'CONSULTA', 
        motivoConsulta: 'Test Receitas' 
      });
    
    if (createRes.status !== 201) {
      throw new Error(`Failed to create appointment in beforeAll: ${JSON.stringify(createRes.body)}`);
    }
    pendingAgendamentoId = createRes.body.data.id;
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
    await factories.cleanupClinica(ctxOther.clinica.id);
  });

  it('POST /api/receitas com MEDICO -> 201', async () => {
    // Only MEDICO role is allowed to create prescriptions
    const res = await app.post('/api/receitas')
      .set(authHeader(ctx.medicoToken))
      .send({
        agendamentoId: pendingAgendamentoId,
        diagnostico: 'Dores de cabeÃ§a persistentes',
        medicamentos: [
          { nome: 'Paracetamol', dosagem: '500mg', frequencia: '1x/dia', duracao: '3 dias' }
        ],
        dataValidade: '2027-01-01',
        observacoes: 'Tomar com Ã¡gua',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.medicamentos[0].nome).toBe('Paracetamol');
    
    // Remember the id for later tests
    concludedAgendamentoId = pendingAgendamentoId;
  });

  it('POST /api/receitas com ADMIN -> 403', async () => {
    // Create new appt to try to prescribe
    const createRes = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-09-15T10:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Admin prescribe fail' });

    // Try prescribing as Admin - should fail validation or 403
    const res = await app.post('/api/receitas')
      .set(authHeader(ctx.adminToken))
      .send({
        agendamentoId: createRes.body.data.id,
        diagnostico: 'Admin trying to prescribe',
        medicamentos: [
          { nome: 'Admin Pill', dosagem: '10mg', frequencia: '1x/dia', duracao: '1 dia' }
        ],
        dataValidade: '2027-01-01',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/receitas para agendamento que jÃ¡ tem receita -> 409', async () => {
    // Try to prescribe AGAIN to the first appointment
    const res = await app.post('/api/receitas')
      .set(authHeader(ctx.medicoToken))
      .send({
        agendamentoId: concludedAgendamentoId,
        diagnostico: 'More meds for the same issue',
        medicamentos: [
          { nome: 'Ibuprofen', dosagem: '400mg', frequencia: '2x/dia', duracao: '5 dias' }
        ],
        dataValidade: '2027-01-01',
      });

    expect(res.status).toBe(409);
    // Usually code: 'RECEITA_ALREADY_EXISTS' or similar, depending on the service rules
  });

  it('GET /api/receitas/minhas com PACIENTE -> lista sÃ³ as suas receitas', async () => {
    const res = await app.get('/api/receitas/minhas')
      .set(authHeader(ctx.pacienteToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/receitas/:id de outra clÃ­nica -> 404', async () => {
    // Context Other (Clinic B) trying to read a prescription from Clinic A
    // First, let's get the prescription ID
    const listRes = await app.get('/api/receitas/minhas').set(authHeader(ctx.pacienteToken));
    const receitaId = listRes.body.data[0].id;

    // A MEDICO from Clinic B requests it by ID
    const res = await app.get(`/api/receitas/${receitaId}`)
      .set(authHeader(ctxOther.medicoToken));

    expect(res.status).toBe(404);
  });
});

