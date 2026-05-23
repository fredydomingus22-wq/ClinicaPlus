import { describe, expect, it, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { CertificationService } from '../CertificationService';
import { buildAgtObterEstadoPayload } from '../buildAgtObterEstadoPayload';

describe('buildAgtObterEstadoPayload', () => {
  let certService: CertificationService;

  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    certService = new CertificationService({
      producerPrivateKey: pem,
      tenantPrivateKey: pem,
    });
  });

  it('omite submissionUUID quando não é fornecido', () => {
    const payload = buildAgtObterEstadoPayload('5001636863', 'REQ-1', certService);

    expect(Object.prototype.hasOwnProperty.call(payload, 'submissionUUID')).toBe(false);
    expect(payload.schemaVersion).toBe('1.2');
    expect(payload.jwsSignature.split('.')).toHaveLength(3);
  });

  it('inclui submissionUUID quando é fornecido', () => {
    const payload = buildAgtObterEstadoPayload('5001636863', 'REQ-1', certService, {
      submissionUUID: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(payload.submissionUUID).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
