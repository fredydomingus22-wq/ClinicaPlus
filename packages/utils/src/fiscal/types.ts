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
}

export interface AgtSoftwareInfo {
  softwareInfoDetail: AgtSoftwareInfoDetail;
  jwsSoftwareSignature: string;
}

export interface AgtDocumentLine {
  lineNumber: string;
  productCode: string;
  productDescription: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string; // Preço sem descontos e sem impostos
  unitPriceBase: string; // Preço com descontos e sem impostos
  debitAmount?: string;
  creditAmount?: string;
  referenceInfo?: {
    reference: string;
    reason: string;
    referenceItemLineNo: string;
  };
  taxes: Array<{
    taxType: string;
    taxCountryRegion: string;
    taxCode: string;
    taxPercentage: string;
    taxBase?: string;
    taxAmount?: string; // Valor fixo IS (se aplicável)
    taxContribution?: string; // Valor calculado do imposto
    taxExemptionCode?: string;
  }>;
  settlementAmount?: string;
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
    taxPayable: string;
    netTotal: string;
    grossTotal: string;
    currency?: {
      currencyCode: string;
      currencyAmount: string;
      exchangeRate: string;
    };
  };
  withholdingTaxList?: Array<{
    withholdingTaxType: string;
    withholdingTaxDescription: string;
    withholdingTaxAmount: string;
  }>;
}

export interface AgtElectronicInvoiceRequest {
  schemaVersion: string;
  submissionUUID: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AgtSoftwareInfo;
  numberOfEntries: string; // NOVO: Total de documentos no array
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
  statusResult: {
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
}

export interface AgtConsultRequest {
  schemaVersion: string;
  submissionUUID: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  invoiceNo: string;
  softwareInfo: AgtSoftwareInfo;
  jwsSignature: string; // Assinatura de taxRegistrationNumber + invoiceNo
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

export interface AgtSeriesRequest {
  schemaVersion: string;
  submissionUUID: string; // N (identificador único da requisição)
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AgtSoftwareInfo;
  jwsSignature: string; // Assinatura de taxRegistrationNumber + submissionUUID (ou requestID conforme manual)
  seriesYear: string;
  documentType: string; // FA, FT, FR, FG, GF, AC, AR, TV, RC, RG, RE, ND, NC, AF, RP, RA, CS
  establishmentNumber: string;
  seriesContingencyIndicator: string;
}

export interface AgtSeriesResponse {
  requestID?: string;
  resultCode: string; // 0-Sucesso, 1-Parcial, 2-Erro, 7-Prematuro, 8-Em curso, 9-Cancelado
  taxRegistrationNumber?: string;
  seriesFEResult?: {
    seriesCode: string;
    authorizedQuantity: string | number;
    firstDocumentNo: string;
    lastDocumentNo: string;
  };
  requestErrorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
  errorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
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
  resultCode: string; // 0, 1, 2, 7, 8, 9
  errorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
  seriesResultCount: string | number;
  seriesInfo: Array<{
    id?: string;
    seriesCode: string;
    seriesYear: string | number;
    seriesStatus: string; // A, U, F
    documentType: string;
    seriesCreationDate: string;
    firstDocumentCreated?: string;
    lastDocumentCreated?: string;
    firstDocumentNumber?: string;
    invoicingMethod: string; // FEPC, FESF, SF
    seriesContingencyIndicator: string; // N, C
    seriesStartTS?: string; // ISO 8601, obrigatório se C
    seriesEndTS?: string; // ISO 8601, obrigatório se C
    nif?: string;
    nome?: string;
    dataAdesao?: string;
    tipoAdesao?: string;
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
