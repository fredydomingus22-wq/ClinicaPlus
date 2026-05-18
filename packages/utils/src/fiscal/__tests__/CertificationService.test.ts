import { describe, it, expect, beforeAll } from 'vitest';
import { CertificationService } from '../CertificationService';
import * as crypto from 'crypto';

describe('CertificationService (Unit)', () => {
  let service: CertificationService;
  let privateKey: string;
  let publicKey: string;

  beforeAll(() => {
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = priv;
    publicKey = pub;
    service = new CertificationService({ privateKey, publicKey });
  });

  it('deve assinar um documento e gerar um hash válido', () => {
    const params = {
      dataEmissao: new Date('2026-05-17'),
      dataDocumento: new Date('2026-05-17T15:00:00Z'),
      numero: 'FT CPLS/1',
      total: 15000.50,
      hashAnterior: ''
    };

    const { hash, hashControl } = service.assinarDocumento(params);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(100);
    expect(hashControl).toBe('1');

    // Verificar se a assinatura bate com o payload esperado
    const valido = service.verificarAssinatura({
      ...params,
      signatureBase64: hash
    });
    expect(valido).toBe(true);
  });

  it('deve falhar na verificação se os dados do documento forem alterados', () => {
    const params = {
      dataEmissao: new Date('2026-05-17'),
      dataDocumento: new Date('2026-05-17'),
      numero: 'FT CPLS/1',
      total: 1000,
      hashAnterior: ''
    };

    const { hash } = service.assinarDocumento(params);

    // Alterar o total
    const invalido = service.verificarAssinatura({
      ...params,
      total: 1001,
      signatureBase64: hash
    });
    expect(invalido).toBe(false);
  });

  it('deve gerar assinatura JWS válida', () => {
    const payload = { test: true };
    const jws = service.signJWS(payload);
    
    expect(jws).toContain('.');
    const [header, data, signature] = jws.split('.');
    expect(header).toBeDefined();
    expect(data).toBeDefined();
    expect(signature).toBeDefined();
  });
});
