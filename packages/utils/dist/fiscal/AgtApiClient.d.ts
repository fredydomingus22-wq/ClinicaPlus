import { type AgtEnv } from './agtEndpoints';
import { Logger, AgtElectronicInvoiceRequest, AgtApiResponse, AgtStatusRequest, AgtStatusResponse, AgtListRequest, AgtListResponse, AgtConsultRequest, AgtConsultResponse, AgtSeriesRequest, AgtSeriesResponse, AgtListSeriesRequest, AgtListSeriesResponse, AgtValidateDocumentRequest, AgtValidateDocumentResponse } from './types';
/**
 * Cliente para a API de Facturação Eletrónica da AGT
 */
export declare class AgtApiClient {
    private client;
    private logger;
    private isMock;
    private env;
    constructor(options: {
        env: AgtEnv;
        logger?: Logger;
        isMock?: boolean;
    });
    private getHeadersForEndpoint;
    private mapAxiosError;
    /**
     * Regista uma factura ou rectificação na AGT
     */
    registarFactura(request: AgtElectronicInvoiceRequest, apiToken: string): Promise<AgtApiResponse>;
    /**
     * Consulta o estado de uma submissão
     */
    obterEstado(request: AgtStatusRequest, apiToken: string): Promise<AgtStatusResponse>;
    /**
     * Lista faturas registradas num intervalo de tempo
     */
    listarFacturas(request: AgtListRequest, apiToken: string): Promise<AgtListResponse>;
    /**
     * Consulta os dados detalhados de uma fatura específica
     */
    consultarFactura(request: AgtConsultRequest, apiToken: string): Promise<AgtConsultResponse>;
    /**
     * Solicita uma nova série de faturação à AGT
     */
    solicitarSerie(request: AgtSeriesRequest, apiToken: string): Promise<AgtSeriesResponse>;
    /**
     * Lista as séries de facturação registadas na AGT
     */
    listarSeries(request: AgtListSeriesRequest, apiToken: string): Promise<AgtListSeriesResponse>;
    /**
     * Valida um documento na AGT (DS.120 v.4.7)
     */
    validarDocumento(request: AgtValidateDocumentRequest, apiToken: string): Promise<AgtValidateDocumentResponse>;
}
//# sourceMappingURL=AgtApiClient.d.ts.map