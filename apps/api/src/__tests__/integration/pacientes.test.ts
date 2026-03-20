import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, authHeader } from '../helpers/request';
import { factories } from '../helpers/factories';

describe('/api/pacientes', () => {
  const app = createTestApp();
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
    // Create an extra patient for search tests
    await factories.createPaciente(ctx.clinica.id, { nome: 'JoÃ£o Silva' });
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  it('GET /api/pacientes -> 200 com lista paginada', async () => {
    const res = await app
      .get('/api/pacientes')
      .set(authHeader(ctx.adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toBeInstanceOf(Array);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.page).toBe(1);
  });

  it('GET /api/pacientes?q=JoÃ£o -> filtra correctamente', async () => {
    const res = await app
      .get('/api/pacientes?q=JoÃ£o')
      .set(authHeader(ctx.adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].nome).toContain('JoÃ£o');
  });

  it('GET /api/pacientes/:id -> 200 com dados do paciente (inclui alergias)', async () => {
    const res = await app
      .get(`/api/pacientes/${ctx.paciente.id}`)
      .set(authHeader(ctx.adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(ctx.paciente.id);
    expect(res.body.data.alergias).toBeInstanceOf(Array);
  });

  it('POST /api/pacientes -> 201 com numeroPaciente gerado (P-YYYY-NNNN)', async () => {
    const res = await app
      .post('/api/pacientes')
      .set(authHeader(ctx.adminToken))
      .send({
        nome: 'Novo Paciente',
        dataNascimento: '1990-01-01', // Date string
        genero: 'M',
        telemovel1: '923000000',
        alergias: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.numeroPaciente).toMatch(/^P-202\d-\d{4}$/); // Matches year 202x
    expect(res.body.data.nome).toBe('Novo Paciente');
  });

  it('POST /api/pacientes com dados invÃ¡lidos -> 400 com field errors (Zod, pt-AO)', async () => {
    const res = await app
      .post('/api/pacientes')
      .set(authHeader(ctx.adminToken))
      .send({
        nome: '', // too short
        genero: 'X', // invalid enum
        dataNascimento: '2000-01-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
    
    const errors = res.body.error.details;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(errors.some((e: any) => e.path === 'nome')).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(errors.some((e: any) => e.path === 'genero')).toBe(true);
  });

  it('PATCH /api/pacientes/:id -> 200 com dados actualizados', async () => {
    const res = await app
      .patch(`/api/pacientes/${ctx.paciente.id}`)
      .set(authHeader(ctx.adminToken))
      .send({
        nome: 'Nome Atualizado',
        alergias: ['Amendoim'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nome).toBe('Nome Atualizado');
    expect(res.body.data.alergias).toContain('Amendoim');
  });

  it('GET /api/pacientes/:id as PACIENTE (own) -> 200', async () => {
    const res = await app
      .get(`/api/pacientes/${ctx.paciente.id}`)
      .set(authHeader(ctx.pacienteToken));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.paciente.id);
  });

  it('GET /api/pacientes/:id as PACIENTE (other) -> 403', async () => {
    const otherPaciente = await factories.createPaciente(ctx.clinica.id);
    const res = await app
      .get(`/api/pacientes/${otherPaciente.id}`)
      .set(authHeader(ctx.pacienteToken));

    expect(res.status).toBe(403);
  });

  it('PATCH /api/pacientes/:id as PACIENTE (own) -> 200', async () => {
    const res = await app
      .patch(`/api/pacientes/${ctx.paciente.id}`)
      .set(authHeader(ctx.pacienteToken))
      .send({ nome: 'Nome Alterado pelo Paciente' });

    expect(res.status).toBe(200);
    expect(res.body.data.nome).toBe('Nome Alterado pelo Paciente');
  });

  it('PATCH /api/pacientes/:id as MEDICO -> 403', async () => {
    const res = await app
      .patch(`/api/pacientes/${ctx.paciente.id}`)
      .set(authHeader(ctx.medicoToken))
      .send({ nome: 'Tentativa do Medico' });

    expect(res.status).toBe(403);
  });

  it('GET /api/pacientes sem token -> 401', async () => {
    const res = await app.get('/api/pacientes');
    expect(res.status).toBe(401);
  });

  it('GET /api/pacientes com token de PACIENTE -> 403', async () => {
    const res = await app
      .get('/api/pacientes')
      .set(authHeader(ctx.pacienteToken));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

