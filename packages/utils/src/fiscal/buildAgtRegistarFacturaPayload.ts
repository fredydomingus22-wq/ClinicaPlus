import type { CertificationService } from './CertificationService';
import type { AgtDocument, AgtDocumentLine, AgtElectronicInvoiceRequest } from './types';

export interface AgtFaturaItemInput {
  id?: string;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  desconto: number;
  taxaIva: number;
  codigoIva?: string | null;
}

export interface AgtFaturaRegistoInput {
  numeroFatura: string;
  tipoDocFiscal: string;
  dataEmissao: Date;
  systemEntryDate: Date;
  subtotal: number;
  totalIva: number;
  total: number;
  retencaoFonte?: number;
  taxRegistrationNumber: string;
  clienteNif: string;
  clienteNome: string;
  clienteCountry?: string;
  itens: AgtFaturaItemInput[];
}

export function getDefaultAgtSoftwareInfoDetail() {
  const isProduction = process.env.NODE_ENV === 'production' && process.env.AGT_MOCK !== 'true';
  const productId = process.env.AGT_PRODUCT_ID || (isProduction ? '' : 'DocAgen');
  const productVersion = process.env.AGT_PRODUCT_VERSION || (isProduction ? '' : '1.0.0');
  const softwareValidationNumber =
    process.env.AGT_SOFTWARE_CERTIFICATE || process.env.AGT_VALIDATION_NUMBER || (isProduction ? '' : '0');

  if (!productId || !productVersion || !softwareValidationNumber) {
    throw new Error('Configuracao AGT incompleta: AGT_PRODUCT_ID, AGT_PRODUCT_VERSION e AGT_SOFTWARE_CERTIFICATE/AGT_VALIDATION_NUMBER sao obrigatorios.');
  }

  return {
    productId,
    productVersion,
    softwareValidationNumber,
    signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1),
  };
}

export interface BuildAgtRegistarFacturaOptions {
  submissionUUID: string;
  submissionTimeStamp?: string;
  softwareInfoDetail: {
    productId: string;
    productVersion: string;
    softwareValidationNumber: string;
    signatureVersion?: number;
  };
  eacCode?: string;
}

function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

function centsToNumber(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function mapTaxCode(taxaIva: number, codigoIva?: string | null): string {
  if (taxaIva === 0) return 'ISE';
  if (codigoIva === 'RED' || taxaIva === 7) return 'RED';
  if (codigoIva === 'NOR' || codigoIva === 'IVA') return 'NOR';
  return taxaIva <= 7 ? 'RED' : 'NOR';
}

function lineBaseCents(item: AgtFaturaItemInput): number {
  return Math.max(0, item.precoUnit * item.quantidade - item.desconto);
}

function lineIvaCents(item: AgtFaturaItemInput): number {
  const base = lineBaseCents(item);
  return Math.round(base * (item.taxaIva / 100));
}

function buildDocumentLine(
  item: AgtFaturaItemInput,
  index: number,
  tipoDocFiscal: string
): AgtDocumentLine {
  const baseCents = lineBaseCents(item);
  const ivaCents = lineIvaCents(item);
  const netAmount = centsToDecimal(baseCents);
  const qty = item.quantidade > 0 ? item.quantidade : 1;
  const unitPriceBaseCents = Math.round(baseCents / qty);

  const taxCode = mapTaxCode(item.taxaIva, item.codigoIva);
  const taxEntry: AgtDocumentLine['taxes'][0] = {
    taxType: 'IVA',
    taxCountryRegion: 'AO',
    taxCode,
    taxPercentage: item.taxaIva.toFixed(2),
    taxBase: centsToDecimal(baseCents),
    taxContribution: centsToDecimal(ivaCents),
  };

  if (item.taxaIva === 0) {
    const code = item.codigoIva?.trim();
    taxEntry.taxExemptionCode =
      code && code !== 'ISE' && code !== 'IVA' && code !== 'NOR' && code !== 'RED' ? code : 'M02';
  }

  const line: AgtDocumentLine = {
    lineNumber: String(index + 1),
    operationType: 'SS',
    productCode: (item.id || item.descricao).substring(0, 30).toUpperCase(),
    productDescription: item.descricao,
    quantity: String(item.quantidade),
    unitOfMeasure: 'UN',
    unitPrice: centsToDecimal(item.precoUnit),
    unitPriceBase: centsToDecimal(unitPriceBaseCents),
    taxes: [taxEntry],
    settlementAmount: '0.00',
  };

  const debitTypes = new Set(['NC', 'RE']);
  if (debitTypes.has(tipoDocFiscal)) {
    line.debitAmount = netAmount;
    line.creditAmount = '0.00';
  } else {
    line.creditAmount = netAmount;
    line.debitAmount = '0.00';
  }

  return line;
}

export function buildDocumentSigningPayload(input: AgtFaturaRegistoInput) {
  return {
    documentNo: input.numeroFatura,
    taxRegistrationNumber: input.taxRegistrationNumber,
    documentType: input.tipoDocFiscal,
    documentDate: input.dataEmissao.toISOString().slice(0, 10),
    customerTaxID: input.clienteNif,
    customerCountry: input.clienteCountry || 'AO',
    companyName: input.clienteNome,
    documentTotals: {
      taxPayable: centsToNumber(input.totalIva),
      netTotal: centsToNumber(input.subtotal),
      grossTotal: centsToNumber(input.total),
    },
  };
}

export function buildAgtRegistarFacturaPayload(
  input: AgtFaturaRegistoInput,
  certService: CertificationService,
  options: BuildAgtRegistarFacturaOptions
): AgtElectronicInvoiceRequest {
  const documentDate = input.dataEmissao.toISOString().slice(0, 10);
  const systemEntryDate = input.systemEntryDate.toISOString();
  const signingPayload = buildDocumentSigningPayload(input);

  const documentTotals = {
    taxPayable: centsToDecimal(input.totalIva),
    netTotal: centsToDecimal(input.subtotal),
    grossTotal: centsToDecimal(input.total),
  };

  const document: AgtDocument = {
    documentNo: input.numeroFatura,
    documentStatus: 'N',
    jwsDocumentSignature: certService.signDocumentJWS(signingPayload),
    documentDate,
    documentType: input.tipoDocFiscal,
    eacCode: options.eacCode || '86201',
    systemEntryDate,
    customerTaxID: input.clienteNif,
    customerCountry: input.clienteCountry || 'AO',
    companyName: input.clienteNome,
    lines: input.itens.map((item, idx) => buildDocumentLine(item, idx, input.tipoDocFiscal)),
    documentTotals,
  };

  if (input.retencaoFonte && input.retencaoFonte > 0) {
    document.withholdingTaxList = [
      {
        withholdingTaxType: 'IRT',
        withholdingTaxDescription: 'Retencao na fonte',
        withholdingTaxAmount: centsToDecimal(input.retencaoFonte),
      },
    ];
  }

  const softwareInfoDetail = {
    ...options.softwareInfoDetail,
    signatureVersion: options.softwareInfoDetail.signatureVersion ?? 1,
  };

  return {
    schemaVersion: '1.2',
    submissionUUID: options.submissionUUID,
    taxRegistrationNumber: input.taxRegistrationNumber,
    submissionTimeStamp: options.submissionTimeStamp ?? new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail,
      jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail),
    },
    numberOfEntries: 1,
    documents: [document],
  };
}

