/**
 * Interface simplificada para Logger compatível com pino
 */
export interface Logger {
  info: (msg: string | object, ...args: any[]) => void;
  error: (msg: string | object, ...args: any[]) => void;
  warn: (msg: string | object, ...args: any[]) => void;
  debug: (msg: string | object, ...args: any[]) => void;
}

export interface AgtSoftwareInfoDetail {
  productId: string;
  productVersion: string;
  softwareValidationNumber: string;
  signatureVersion: number;
}

export interface AgtSoftwareInfo {
  softwareInfoDetail: AgtSoftwareInfoDetail;
  jwsSoftwareSignature: string;
}

export interface AgtDocumentLine {
  /** DS.120: integer (>=1) */
  lineNumber: number;
  operationType: string;
  productCode: string;
  productDescription: string;
  /** DS.120: number (>=0) */
  quantity: number;
  unitOfMeasure: string;
  /** DS.120: number (>=0) — Preço unitário já deduzido de descontos, sem impostos */
  unitPrice: number;
  /** DS.120: number (>=0) — Preço unitário base (sem descontos e sem impostos) */
  unitPriceBase: number;
  debitAmount?: number;
  creditAmount?: number;
  referenceInfo?: {
    reference: string;
    reason: string;
    referenceItemLineNo: string;
  };
  taxes: Array<{
    taxType: string;
    taxCountryRegion: string;
    taxCode: string;
    taxPercentage: number;
    taxBase?: number;
    taxAmount?: number; // Valor fixo IS (se aplicável)
    taxContribution?: number; // Valor calculado do imposto
    taxExemptionCode?: string;
  }>;
  settlementAmount?: number;
}

export interface AgtDocument {
  documentNo: string;
  documentStatus: string;
  documentCancelReason?: string; // Obrigatório se documentStatus = 'A'
  rejectedDocumentNo?: string;   // Obrigatório se documentStatus = 'C'
  jwsDocumentSignature: string;
  documentDate: string;
  documentType: string;
  eacCode?: string;
  systemEntryDate: string;
  customerTaxID: string;
  customerCountry: string;
  companyName: string;
  lines: AgtDocumentLine[];
  documentTotals: {
    taxPayable: number;
    netTotal: number;
    grossTotal: number;
    currency?: {
      currencyCode: string;
      currencyAmount: number;
      exchangeRate: number;
    };
  };
  withholdingTaxList?: Array<{
    withholdingTaxType: string;
    withholdingTaxDescription: string;
    withholdingTaxAmount: number;
  }>;
}

export interface AgtElectronicInvoiceRequest {
  schemaVersion: string;
  submissionUUID: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AgtSoftwareInfo;
  numberOfEntries: number; // Total de documentos no array
  documents: AgtDocument[];
}

export interface AgtStatusRequest {
  schemaVersion: string;
  submissionUUID?: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AgtSoftwareInfo;
  requestID: string;
  jwsSignature: string; // NOVO: Assinatura de taxRegistrationNumber + requestID
}

export interface AgtStatusResponse {
  requestID: string;
  resultCode: string;
  taxRegistrationNumber: string;
  documentStatusList?: Array<{
    documentNo: string;
    documentStatus: string;
    errorList?: Array<{
      idError: string;
      descriptionError: string;
    }>;
  }>;
  requestErrorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
}

export interface AgtApiResponse {
  requestID?: string;
  errorList?: Array<{
    idError: string;
    descriptionError: string;
    documentNo?: string;
  }>;
  [key: string]: any; // Para compatibilidade com responses variadas
}

export interface AgtListRequest {
  schemaVersion: string;
  submissionGUID: string;
  submissionTimeStamp: string;
  softwareInfo: AgtSoftwareInfo;
  jwsSignature: string;
  taxRegistrationNumber: string;
  queryStartDate: string;
  queryEndDate: string;
}

export interface AgtListResponse {
  statusResult?: {
    documentResultCount: string;
    resultEntryList: Array<{
      documentEntryResult: {
        id: string;
        documentType: string;
        documentNo: string;
        documentDate: string;
        documentStatus: string;
        documentStatusDescription: string;
        netTotal: string;
      };
    }>;
  };
  documentListResult?: {
    documentResultCount: string | number;
    documentResultList: Array<{
      documentNo: string;
      documentDate: string;
    }>;
  };
  errorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
}

export interface AgtConsultRequest {
  schemaVersion: string;
  submissionUUID: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  documentNo: string;
  invoiceNo?: string;
  softwareInfo: AgtSoftwareInfo;
  jwsSignature: string; // Assinatura de taxRegistrationNumber + documentNo
}

export interface AgtConsultResponse {
  documentNo: string;
  documentStatus: string; // V or I
  document: {
    documentNo: string;
    documentStatus: string;
    documentType: string;
    documentDate: string;
    systemEntryDate: string;
    reportUrl?: string;
    costumerName?: string;
    customerTaxID: string;
    customerCountry: string;
    companyName: string;
    emitterTaxId?: string;
    softwareValidationNo: string;
    jwsSignature?: string; // Assinatura da factura
    documentTotals: {
      taxPayable: string;
      netTotal: string;
      grossTotal: string;
      currency?: {
        currencyCode: string;
        currencyAmount: string;
        exchangeRate: string;
      };
    };
    lines: Array<{
      lineNumber: string;
      productCode: string;
      productDescription: string;
      quantity: string;
      unitOfMeasure?: string;
      unitPrice?: string;
      unitPriceBase?: string;
      debitAmount?: string;
      creditAmount?: string;
      settlementAmount?: string;
      taxes: Array<{
        taxType: string;
        taxCountryRegion: string;
        taxCode?: string;
        taxBase?: string;
        taxPercentage?: string;
        taxAmount?: string;
        taxContribution?: string;
        taxExemptionCode?: string;
      }>;
    }>;
    withholdingTaxList?: Array<{
      withholdingTaxType: string;
      withholdingTaxDescription: string;
      withholdingTaxAmount: string;
    }>;
    paymentReceipt?: Array<{
      lineNo: string;
      debitAmount?: string;
      creditAmount?: string;
    }>;
  };
  documentStatusList?: Array<{
    documentNo: string;
    documentStatus: string;
    errorList?: Array<{
      idError: string;
      descriptionError: string;
    }>;
  }>;
  errorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
}

/** Tipos de documento aceites pela AGT (FE DS.120) */
export type AgtDocumentType =
  | 'FA' // Factura de Adiantamento
  | 'FT' // Factura
  | 'FR' // Factura/Recibo
  | 'FG' // Factura Global
  | 'GF' // Factura Genérica
  | 'AC' // Aviso de Cobrança
  | 'AR' // Aviso de Cobrança/Recibo
  | 'TV' // Talão de Venda
  | 'RC' // Recibo em numerário (cash)
  | 'RG' // Recibo Geral
  | 'RE' // Estorno ou Recibo de Estorno
  | 'ND' // Nota de Débito
  | 'NC' // Nota de Crédito
  | 'AF' // Factura/Recibo de Autofacturação
  | 'RP' // Prémio ou Recibo de Prémio
  | 'RA' // Resseguro Aceite
  | 'CS' // Imputação a Co-seguradoras
  | 'LD'; // Imputação a Co-seguradora Líder

export interface AgtSeriesRequest {
  schemaVersion: string;
  submissionUUID: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AgtSoftwareInfo;
  /**
   * Assinatura RS256 dos campos:
   * taxRegistrationNumber, establishmentNumber, seriesYear, documentType
   */
  jwsSignature: string;
  seriesYear: string;
  documentType: AgtDocumentType;
  /** Código do estabelecimento; usar "SEDE" para testes / contribuinte de localização única */
  establishmentNumber: string;
  /** "N" = regime normal; "C" = contingência */
  seriesContingencyIndicator: 'N' | 'C';
  seriesStartTS?: string;
  seriesEndTS?: string;
}

export interface AgtSeriesResponse {
  /** 1 = sucesso (doc oficial usa número inteiro, não string) */
  resultCode: number;
  errorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
  seriesFEResult?: {
    seriesCode: string;
    authorizedQuantity: string;
    firstDocumentNo: string;
    lastDocumentNo: string;
  };
}

// Para compatibilidade com o worker atual até refactor completo
export interface AgtInvoicePayload {
  invoiceNumber: string;
  invoiceDate: string;
  customerTaxID: string;
  customerName: string;
  totalAmount: number;
  hash: string;
  hashControl: string;
  tipoDocFiscal: string;
}

export interface AgtListSeriesRequest {
  schemaVersion: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  seriesCode?: string;
  seriesYear?: string;
  seriesStatus?: string; // A-Aberta, U-Em utilização, F-Fechada
  documentType?: string; // FA, FT, FR, FG, GF, AC, AR, TV, RC, RG, RE, ND, NC, AF, RP, RA, CS, LD
  establishmentNumber: string; // Obrigatório no Listar
  jwsSignature: string; // Assinatura de taxRegistrationNumber + requestID (conforme manual)
  softwareInfo: AgtSoftwareInfo;
}

export interface AgtListSeriesResponse {
  requestID: string;
  resultCode: string;
  taxRegistrationNumber: string;
  documentStatusList?: Array<{
    documentNo: string;
    documentStatus: string;
    document: unknown;
    errorList?: Array<{
      idError: string;
      descriptionError: string;
    }>;
  }>;
  requestErrorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
}

/**
 * Erros específicos da comunicação com a AGT
 */
export class AgtError extends Error {
  public code: string | number;
  public agtCode?: string | undefined;

  constructor(message: string, code: string | number, agtCode?: string | undefined) {
    super(message);
    this.name = 'AgtError';
    this.code = code;
    this.agtCode = agtCode;
  }

  /**
   * Mapeia códigos de erro da AGT para mensagens amigáveis em PT-AO
   */
  static fromStatus(status: number, agtCode?: string): AgtError {
    switch (status) {
      case 400:
        if (agtCode === 'E93') return new AgtError('Documento não reconhecido pela AGT. Verifique os dados.', 400, 'E93');
        return new AgtError('Erro na estrutura do pedido enviado à AGT.', 400);
      case 422:
        return new AgtError('Configuração Inválida: O NIF do certificado não corresponde ao NIF da clínica (E94).', 422, 'E94');
      case 429:
        return new AgtError('Muitas solicitações seguidas. Aguarde alguns segundos antes de tentar novamente (E98).', 429, 'E98');
      default:
        return new AgtError('Ocorreu um erro inesperado na comunicação com a AGT.', status);
    }
  }
}

export interface AgtValidateDocumentRequest {
  schemaVersion: string;
  submissionTimeStamp: string;
  taxRegistrationNumber: string;
  softwareInfo: AgtSoftwareInfo;
  jwsSignature: string; // taxRegistrationNumber + requestID (conforme manual)
  documentNo: string;
  action: string; // C - Confirmação, R - Rejeição
  deductibleVATPercentage?: string | number; // Só um dos dois
  nonDeductibleAmount?: string | number; // Só um dos dois
}

export interface AgtValidateDocumentResponse {
  actionResultCode: string; // C_OK, R_OK, C_NOK, R_NOK
  documentStatusCode: string; // S_A, S_C, S_I, S_RG, S_RJ, S_V
  errorList?: Array<{
    idError: string;
    documentNo: string;
    descriptionError: string;
  }>;
}
