import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { factories } from '../helpers/factories';
import { certificationService } from '../../services/fiscal/CertificationService';
import * as crypto from 'crypto';

describe('Fiscal Compliance & Integration', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;
  let privateKey: string;
  let publicKey: string;

  beforeAll(async () => {
    // 1. Gerar par de chaves RSA-2048 para o teste
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = priv;
    publicKey = pub;

    // Configurar variáveis de ambiente para o serviço de certificação
    process.env.AGT_PRIVATE_KEY = privateKey;
    process.env.AGT_PUBLIC_KEY = publicKey;

    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    if (ctx) {
      await factories.cleanupClinica(ctx.clinica.id);
    }
  });

  let faturas: any[] = [];

  it('1. Deve emitir uma sequência de 3 faturas e garantir a Hash Chain', async () => {
    for (let i = 1; i <= 3; i++) {
      // Criar rascunho
      const draft = await request(app)
        .post('/api/faturas')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          pacienteId: ctx.paciente.id,
          tipo: 'PARTICULAR',
          itens: [{ descricao: `Serviço ${i}`, quantidade: 1, precoUnit: 1000 * i, taxaIva: 14 }],
        });

      const faturaId = draft.body.data.id;

      // Emitir
      const emit = await request(app)
        .patch(`/api/faturas/${faturaId}/emitir`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(emit.status).toBe(200);
      faturas.push(emit.body.data);
    }

    // Validar Cadeia
    // Fatura 2 deve ter hashAnterior = hash da Fatura 1
    expect(faturas[1].hashAnterior).toBe(faturas[0].fiscalHash);
    // Fatura 3 deve ter hashAnterior = hash da Fatura 2
    expect(faturas[2].hashAnterior).toBe(faturas[1].fiscalHash);
  });

  it('2. Deve validar a assinatura digital RSA-2048 de uma fatura', async () => {
    const fatura = faturas[0];
    
    const payload = {
      dataEmissao: new Date(fatura.dataEmissao),
      dataDocumento: new Date(fatura.criadoEm),
      numero: fatura.numeroFatura,
      total: fatura.total,
      hashAnterior: fatura.hashAnterior || '',
      signatureBase64: fatura.fiscalHash
    };

    const isValido = certificationService.verificarAssinatura(payload);
    expect(isValido).toBe(true);
  });

  it('3. Deve passar na auditoria de hash chain via API', async () => {
    const res = await request(app)
      .get('/api/fiscal/audit/hash-chain')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.valida).toBe(true);
    expect(res.body.totalDocumentos).toBeGreaterThanOrEqual(3);
  });

  it('4. Deve testar a conexão com a AGT (Mock Mode)', async () => {
    process.env.AGT_MOCK = 'true';
    const res = await request(app)
      .post('/api/fiscal/testar-conexao')
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.mensagem).toContain('sucesso');
  });

  it('5. Deve exportar SAF-T AO e conter estrutura básica v1.01_01', async () => {
    const res = await request(app)
      .get(`/api/fiscal/saft?inicio=2024-01-01&fim=2026-12-31`)
      .set('Authorization', `Bearer ${ctx.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('xml');
    
    const xml = res.text;
    expect(xml).toContain('AuditFileSchemaVersion');
    expect(xml).toContain('1.01_01');
    expect(xml).toContain('TaxRegistrationNumber');
    expect(xml).toContain('<Invoice>');
  });
});
