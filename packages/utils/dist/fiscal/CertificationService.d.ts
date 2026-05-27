/**
 * Serviço responsável por assinaturas digitais RSA-2048.
 * Gere duas identidades:
 * 1. Produtor (ClinicaPlus): Para jwsSoftwareSignature (fixa global).
 * 2. Contribuinte (Clínica): Para jwsDocumentSignature e jwsSignature (específica por tenant).
 */
export declare class CertificationService {
    private producerPrivateKey;
    private tenantPrivateKey;
    private tenantPublicKey;
    constructor(keys?: {
        producerPrivateKey?: string | undefined;
        tenantPrivateKey?: string | undefined;
        tenantPublicKey?: string | undefined;
    });
    private validateKeySize;
    private ensureProducerKey;
    private ensureTenantKey;
    /**
     * Converte um objeto para JSON sem espaços e com chaves ordenadas (JSON Canónico)
     */
    private canonicalStringify;
    /**
     * Assinatura JWS genérica com uma chave específica
     */
    private signWithKey;
    /**
     * jwsSoftwareSignature: Assina com a chave do PRODUTOR
     */
    signSoftwareJWS(data: {
        productId: string;
        productVersion: string;
        softwareValidationNumber: string;
        signatureVersion?: number;
    }): string;
    /**
     * jwsDocumentSignature: Assina com a chave do TENANT (Contribuinte)
     */
    signDocumentJWS(data: any): string;
    /**
     * jwsSignature: Assina com a chave do TENANT (Contribuinte)
     */
    signRequestJWS(data: {
        taxRegistrationNumber: string;
        requestID: string;
    } | any): string;
    /**
     * Assinatura legada para SAF-T e Hash Chain (faturas.fiscalHash)
     * Usa a chave do TENANT.
     */
    assinarDocumento(params: {
        dataEmissao: Date;
        dataDocumento: Date;
        numero: string;
        total: number;
        hashAnterior: string;
    }): {
        hash: string;
        hashControl: string;
    };
    /**
     * Verifica a validade de um hash (Usa chave pública do TENANT)
     */
    verificarAssinatura(params: {
        dataEmissao: Date;
        dataDocumento: Date;
        numero: string;
        total: number;
        hashAnterior: string;
        signatureBase64: string;
    }): boolean;
}
//# sourceMappingURL=CertificationService.d.ts.map