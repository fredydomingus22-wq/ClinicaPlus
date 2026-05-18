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
  seriesStatus?: string;
  documentType?: string;
  establishmentNumber?: string;
  jwsSignature: string;
  softwareInfo: AgtSoftwareInfo;
}

export interface AgtListSeriesResponse {
  resultCode: string;
  errorList?: Array<{
    idError: string;
    descriptionError: string;
  }>;
  seriesResultCount: string;
  seriesInfo: Array<{
    id: string;
    seriesCode: string;
    seriesYear: string;
    seriesStatus: string;
    documentType: string;
    seriesCreationDate: string;
    firstDocumentCreated?: string;
    lastDocumentCreated?: string;
    firstDocumentNumber?: string;
    invoicingMethod: string;
    nif: string;
    nome: string;
    dataAdesao?: string;
    tipoAdesao?: string;
  }>;
}
