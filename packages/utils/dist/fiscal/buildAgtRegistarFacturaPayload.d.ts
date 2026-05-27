import type { CertificationService } from './CertificationService';
import type { AgtElectronicInvoiceRequest } from './types';
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
    /** Denominação do contribuinte emissor (clínica). Vai para `document.companyName`. */
    emitenteNome: string;
    clienteNif: string;
    clienteNome: string;
    clienteCountry?: string;
    itens: AgtFaturaItemInput[];
}
export declare function getDefaultAgtSoftwareInfoDetail(): {
    productId: string;
    productVersion: string;
    softwareValidationNumber: string;
    signatureVersion: number;
};
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
export declare function buildDocumentSigningPayload(input: AgtFaturaRegistoInput): {
    documentNo: string;
    taxRegistrationNumber: string;
    documentType: string;
    documentDate: string;
    customerTaxID: string;
    customerCountry: string;
    companyName: string;
    documentTotals: {
        taxPayable: number;
        netTotal: number;
        grossTotal: number;
    };
};
export declare function buildAgtRegistarFacturaPayload(input: AgtFaturaRegistoInput, certService: CertificationService, options: BuildAgtRegistarFacturaOptions): AgtElectronicInvoiceRequest;
//# sourceMappingURL=buildAgtRegistarFacturaPayload.d.ts.map