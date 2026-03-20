import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/request';
const request = createTestApp();
import { factories } from '../helpers/factories';

describe('Reproduction: GET /api/medicos 400 error', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  it('should return 200 for basic pagination', async () => {
    const res = await request
      .get('/api/medicos?page=1&limit=15')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    if (res.status === 400) {
      // eslint-disable-next-line no-console
      console.log('REPRODUCED 400 Error Body:', JSON.stringify(res.body, null, 2));
    }
    expect(res.status).toBe(200);
  });

  it('should return 200 when especialidadeId is empty string', async () => {
    const res = await request
      .get('/api/medicos?page=1&limit=15&especialidadeId=')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    if (res.status === 400) {
      // eslint-disable-next-line no-console
      console.log('REPRODUCED 400 (empty specialty) Error Body:', JSON.stringify(res.body, null, 2));
    }
    expect(res.status).toBe(200);
  });

  it('should return 200 when ativo is "true"', async () => {
    const res = await request
      .get('/api/medicos?page=1&limit=15&ativo=true')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    if (res.status === 400) {
      // eslint-disable-next-line no-console
      console.log('REPRODUCED 400 (ativo=true) Error Body:', JSON.stringify(res.body, null, 2));
    }
    expect(res.status).toBe(200);
  });

  it('should FAIL (400) if especialidadeId is literally "null" or null? (Wait, query params are strings)', async () => {
    // If frontend sends null, Axios might send literally "null" or empty string or omit it.
    // But if something bypasses client and sends a real null (unlikely in GET), it would fail.
    // However, if the service logic or something else expects a specific type, it might fail.
    const res = await request
      .get('/api/medicos?page=1&limit=100&especialidadeId=null&ativo=true')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    if (res.status === 400) {
      // eslint-disable-next-line no-console
      console.log('REPRODUCED 400 (especialidadeId="null") Error Body:', JSON.stringify(res.body, null, 2));
    }
    // We expect this to match what the user sees.
    // If it returns 200, then "null" string is not the issue.
  });
});
