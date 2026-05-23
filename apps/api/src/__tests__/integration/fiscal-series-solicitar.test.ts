import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import * as crypto from 'crypto';
import { app } from '../../server';
import { factories } from '../helpers/factories';
import { agtApiClient } from '../../services/fiscal/AgtApiClient';

describe('Fiscal Series - solicitarSerie payload compliance', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  function decodeJwsPayload(jws: string) {
    const payload = jws.split('.')[1];
    if (!payload) throw new Error('JWS payload ausente');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  }

  beforeAll(async () => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.AGT_PRIVATE_KEY = privateKey;
    process.env.AGT_MOCK = 'true';
    process.env.AGT_SOFTWARE_CERTIFICATE = process.env.AGT_SOFTWARE_CERTIFICATE || 'C_134';

    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    await factories.cleanupClinica(ctx.clinica.id);
  });

  it('deve enviar establishmentNumber no payload para a AGT', async () => {
    const solicitarSerieSpy = vi.spyOn(agtApiClient, 'solicitarSerie').mockResolvedValue({
      resultCode: 1,
      seriesFEResult: {
        seriesCode: 'LD6325S2042N',
        authorizedQuantity: '999999999999',
        firstDocumentNo: '1',
        lastDocumentNo: '999999999999',
      },
    });

    const establishmentNumber = '10';

    const res = await request(app)
      .post('/api/fiscal/series/solicitar')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({
        documentType: 'LD',
        establishmentNumber,
      });

    expect(res.status).toBe(200);
    expect(solicitarSerieSpy).toHaveBeenCalledTimes(1);
    expect(solicitarSerieSpy.mock.calls[0]?.[0]).toMatchObject({
      documentType: 'LD',
      establishmentNumber: '10',
      seriesContingencyIndicator: 'N',
      schemaVersion: '1.2',
    });
    expect(solicitarSerieSpy.mock.calls[0]?.[0]?.jwsSignature).toBeTypeOf('string');
    expect(decodeJwsPayload(solicitarSerieSpy.mock.calls[0]![0].jwsSignature)).toMatchObject({
      taxRegistrationNumber: ctx.clinica.nif,
      establishmentNumber: '10',
      seriesYear: new Date().getFullYear().toString(),
      documentType: 'LD',
      seriesContingencyIndicator: 'N',
    });

    solicitarSerieSpy.mockRestore();
  });
});

