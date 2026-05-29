import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { CertificationService } from '../CertificationService';
import {
  buildAgtRegistarFacturaPayload,
  buildDocumentSigningPayload,
  type AgtFaturaRegistoInput,
} from '../buildAgtRegistarFacturaPayload';

describe('buildAgtRegistarFacturaPayload', () => {
  let certService: CertificationService;
  const baseInput: AgtFaturaRegistoInput = {
    numeroFatura: 'FT FT6325S2C/10006',
    tipoDocFiscal: 'FT',
    dataEmissao: new Date('2025-11-04T12:00:00Z'),
    systemEntryDate: new Date('2025-11-04T11:15:30Z'),
    subtotal: 50000,
    totalIva: 7000,
    total: 57000,
    retencaoFonte: 0,
    taxRegistrationNumber: '5001636863',
    emitenteNome: 'Clinica Exemplo Lda',
    clienteNif: 'PT987654321',
    clienteNome: 'Cliente Exemplo Lda',
    clienteCountry: 'PT',
    itens: [
      {
        id: 'prod-001',
        descricao: 'Produto Exemplo 1',
        quantidade: 2,
        precoUnit: 25000,
        desconto: 0,
        taxaIva: 14,
        codigoIva: 'NOR',
      },
    ],
  };

  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    certService = new CertificationService({
      producerPrivateKey: pem,
      tenantPrivateKey: pem,
    });
  });

  it('monta payload de assinatura conforme spec AGT', () => {
    const sig = buildDocumentSigningPayload(baseInput);
    expect(sig).toEqual({
      documentNo: 'FT FT6325S2C/10006',
      taxRegistrationNumber: '5001636863',
      documentType: 'FT',
      documentDate: '2025-11-04',
      customerTaxID: 'PT987654321',
      customerCountry: 'PT',
      companyName: 'Clinica Exemplo Lda',
      documentTotals: {
        taxPayable: 70,
        netTotal: 500,
        grossTotal: 570,
      },
    });
  });

  it('usa creditAmount em FT e debitAmount em NC conforme exemplo AGT', () => {
    const ftPayload = buildAgtRegistarFacturaPayload(baseInput, certService, {
      submissionUUID: 'uuid-ft',
      softwareInfoDetail: {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: 'C_134',
      },
    });
    const ftLine = ftPayload.documents[0]!.lines[0]!;
    expect(ftLine.creditAmount).toBe(500);
    expect(ftLine.debitAmount).toBeUndefined();
    expect(ftLine.taxes[0]?.taxContribution).toBe(70);

    const ncPayload = buildAgtRegistarFacturaPayload(
      { ...baseInput, tipoDocFiscal: 'NC' },
      certService,
      {
        submissionUUID: 'uuid-nc',
        softwareInfoDetail: {
          productId: 'DocAgen',
          productVersion: '1.0.0',
          softwareValidationNumber: 'C_134',
        },
      }
    );
    const ncLine = ncPayload.documents[0]!.lines[0]!;
    expect(ncLine.debitAmount).toBe(500);
    expect(ncLine.creditAmount).toBeUndefined();
  });

  it('inclui withholdingTaxList quando há retenção', () => {
    const payload = buildAgtRegistarFacturaPayload(
      { ...baseInput, retencaoFonte: 1650 },
      certService,
      {
        submissionUUID: 'uuid-irt',
        softwareInfoDetail: {
          productId: 'DocAgen',
          productVersion: '1.0.0',
          softwareValidationNumber: 'C_134',
        },
      }
    );
    expect(payload.documents[0]?.withholdingTaxList).toEqual([
      {
        withholdingTaxType: 'IRT',
        withholdingTaxDescription: 'Retencao na fonte',
        withholdingTaxAmount: 16.5,
      },
    ]);
  });

  it('gera JWS e envelope v1.2', () => {
    const payload = buildAgtRegistarFacturaPayload(baseInput, certService, {
      submissionUUID: 'a1b2c3d4-e5f6-7890-g1h2-i23822j2232-3784',
      softwareInfoDetail: {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: 'C_134',
        signatureVersion: 1,
      },
    });

    expect(payload.schemaVersion).toBe('1.2');
    expect(payload.numberOfEntries).toBe(1);
    expect(payload.documents[0]?.jwsDocumentSignature.split('.')).toHaveLength(3);
    expect(payload.softwareInfo.jwsSoftwareSignature.split('.')).toHaveLength(3);
    expect(payload.documents[0]?.documentDate).toBe('2025-11-04');
    expect(payload.documents[0]?.lines[0]?.unitOfMeasure).toBe('UN');
    expect(payload.documents[0]?.systemEntryDate).toContain('T');
  });

  it('normaliza quantity: nunca envia "0" (fallback -> 1)', () => {
    const payload = buildAgtRegistarFacturaPayload(
      {
        ...baseInput,
        itens: [
          {
            ...baseInput.itens[0]!,
            quantidade: 0,
          },
        ],
      },
      certService,
      {
        submissionUUID: 'uuid-qty-0',
        softwareInfoDetail: {
          productId: 'DocAgen',
          productVersion: '1.0.0',
          softwareValidationNumber: 'C_134',
        },
      }
    );

    const line = payload.documents[0]!.lines[0]!;
    expect(line.quantity).toBe(1);
  });
});
