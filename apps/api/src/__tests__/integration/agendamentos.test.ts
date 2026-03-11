import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, authHeader } from '../helpers/request';
import { factories } from '../helpers/factories';

describe('/api/agendamentos', () => {
  let app = createTestApp();
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;
  let ctxOther: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>; // For cross-clinic tests

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
    ctxOther = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
    await factories.cleanupClinica(ctxOther.clinica.id);
  });

  it('GET /api/agendamentos/hoje -> lista do dia ordenada por hora', async () => {
    // Create an appointment for today
    const dataHoraValue = new Date();
    dataHoraValue.setHours(10, 0, 0, 0); // 10:00 today UTC
    
    await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: dataHoraValue.toISOString(), tipo: 'CONSULTA', motivoConsulta: 'Teste Hoje' });

    const res = await app.get('/api/agendamentos/hoje').set(authHeader(ctx.adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    
    // We expect at least one from the seeded data
    const agenda = res.body.data.find((a: any) => a.paciente.id === ctx.paciente.id && a.medico.id === ctx.medico.id);
    expect(agenda).toBeDefined();
    expect(agenda.estado).toBe('PENDENTE');
  });

  it('POST /api/agendamentos com slot disponível -> 201 com estado PENDENTE', async () => {
    const res = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-09-15T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Dor no peito há 3 dias' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('PENDENTE');
  });

  it('POST /api/agendamentos com slot ocupado -> 409 SLOT_NOT_AVAILABLE', async () => {
    // try exact same slot from previous test
    const res = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-09-15T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Segunda marcação' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SLOT_NOT_AVAILABLE');
  });

  it('POST /api/agendamentos com medico de outra clinica -> 404 PATIENT_NOT_FOUND or MEDICO_NOT_FOUND', async () => {
    const res = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken)) // clinic A
      .send({ pacienteId: ctx.paciente.id, medicoId: ctxOther.medico.id, dataHora: '2026-09-16T10:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Cross clinic fail' });

    // Assuming our service handles clinician check with a 404 (not found in tenant)
    expect(res.status).toBe(404);
  });

  it('PATCH /api/agendamentos/:id/estado PENDENTE->CONFIRMADO -> 200', async () => {
    // Create new specific test appointment
    const createRes = await app.post('/api/agendamentos')
      .set(authHeader(ctx.adminToken))
      .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-10-01T14:30:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'To update estado' });
    const agId = createRes.body.data.id;

    // Change to CONFIRMADO
    const res = await app.patch(`/api/agendamentos/${agId}/estado`)
      .set(authHeader(ctx.adminToken))
      .send({ estado: 'CONFIRMADO' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('CONFIRMADO');
  });

  it('PATCH /api/agendamentos/:id/estado CONFIRMADO->CONCLUIDO -> 409 INVALID_STATE_TRANSITION', async () => {
    // Using previous appointment which is now CONFIRMADO
    // Let's retrieve it first to ensure we use the same id (we can just query it)
    const listRes = await app.get('/api/agendamentos').set(authHeader(ctx.adminToken));
    const confirmados = listRes.body.data.items.filter((a: any) => a.estado === 'CONFIRMADO');
    const agId = confirmados[0].id;

    const res = await app.patch(`/api/agendamentos/${agId}/estado`)
      .set(authHeader(ctx.adminToken))
      .send({ estado: 'CONCLUIDO' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('PATCH /api/agendamentos/:id/triagem -> 200 estado muda para EM_PROGRESSO', async () => {
    // Using the same confirmed appointment
    const listRes = await app.get('/api/agendamentos').set(authHeader(ctx.adminToken));
    const agId = listRes.body.data.items.filter((a: any) => a.estado === 'CONFIRMADO')[0].id;

    const res = await app.patch(`/api/agendamentos/${agId}/triagem`)
      .set(authHeader(ctx.adminToken))
      .send({ peso: 70, altura: 175, pa: '120/80', temperatura: 36.5, urgencia: 'NORMAL' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('EM_PROGRESSO');
    expect(res.body.data.triagem.imc).toBeCloseTo(22.86, 1); // verify trigger calculation exists
  });

  it('GET /api/agendamentos/meus com token de PACIENTE -> lista só os seus', async () => {
    const res = await app.get('/api/agendamentos/meus').set(authHeader(ctx.pacienteToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toBeInstanceOf(Array);
    for (const item of res.body.data.items) {
      expect(item.paciente.id).toBe(ctx.paciente.id);
    }
  });

  it('PATCH /api/agendamentos/:id/estado cancelar paciente -> 200', async () => {
    // Create an appt as patient to then cancel it
    const createRes = await app.post('/api/agendamentos')
      .set(authHeader(ctx.pacienteToken))
      .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-12-01T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'To cancel' });

    expect(createRes.status).toBe(201);
    const cancelId = createRes.body.data.id;

    const res = await app.patch(`/api/agendamentos/${cancelId}/estado`)
      .set(authHeader(ctx.pacienteToken))
      .send({ estado: 'CANCELADO' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('CANCELADO');
  });

  it('PATCH /api/agendamentos/:id/estado concluir com token paciente -> 403', async () => {
    // Create a new appointment as patient so we definitely have a PENDENTE one
    const createRes = await app.post('/api/agendamentos')
      .set(authHeader(ctx.pacienteToken))
      .send({ pacienteId: ctx.paciente.id, medicoId: ctx.medico.id, dataHora: '2026-12-02T09:00:00.000Z', tipo: 'CONSULTA', motivoConsulta: 'Conclude test' });
    expect(createRes.status).toBe(201);
    const pendenteId = createRes.body.data.id;

    // Test role restriction, patient not allowed to conclude
    const res = await app.patch(`/api/agendamentos/${pendenteId}/estado`)
      .set(authHeader(ctx.pacienteToken))
      .send({ estado: 'CONCLUIDO' });

    // Since patients cannot reach the generic controller for arbitrary state changes (we restricted it)
    expect(res.status).toBe(403);
  });
});
