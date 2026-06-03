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
        taxAmount?: number;
        taxContribution?: number;
        taxExemptionCode?: string;
    }>;
    settlementAmount?: number;
}
export interface AgtDocument {
    documentNo: string;
    documentStatus: string;
    documentCancelReason?: string;
    rejectedDocumentNo?: string;
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
    numberOfEntries: number;
    documents: AgtDocument[];
}
export interface AgtStatusRequest {
    schemaVersion: string;
    submissionUUID?: string;
    taxRegistrationNumber: string;
    submissionTimeStamp: string;
    softwareInfo: AgtSoftwareInfo;
    requestID: string;
    jwsSignature: string;
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
    [key: string]: any;
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
    jwsSignature: string;
}
export interface AgtConsultResponse {
    documentNo: string;
    documentStatus: string;
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
        jwsSignature?: string;
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
export type AgtDocumentType = 'FA' | 'FT' | 'FR' | 'FG' | 'GF' | 'AC' | 'AR' | 'TV' | 'RC' | 'RG' | 'RE' | 'ND' | 'NC' | 'AF' | 'RP' | 'RA' | 'CS' | 'LD';
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
    establishmentNumber: string;
    jwsSignature: string;
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
export declare class AgtError extends Error {
    code: string | number;
    agtCode?: string | undefined;
    constructor(message: string, code: string | number, agtCode?: string | undefined);
    /**
     * Mapeia códigos de erro da AGT para mensagens amigáveis em PT-AO
     */
    static fromStatus(status: number, agtCode?: string): AgtError;
}
export interface AgtValidateDocumentRequest {
    schemaVersion: string;
    submissionTimeStamp: string;
    taxRegistrationNumber: string;
    softwareInfo: AgtSoftwareInfo;
    jwsSignature: string;
    documentNo: string;
    action: string;
    deductibleVATPercentage?: string | number;
    nonDeductibleAmount?: string | number;
}
export interface AgtValidateDocumentResponse {
    actionResultCode: string;
    documentStatusCode: string;
    errorList?: Array<{
        idError: string;
        documentNo: string;
        descriptionError: string;
    }>;
}
//# sourceMappingURL=types.d.ts.map