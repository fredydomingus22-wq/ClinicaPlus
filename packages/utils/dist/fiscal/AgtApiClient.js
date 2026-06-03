"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgtApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const crypto_1 = __importDefault(require("crypto"));
const agtAuth_1 = require("./agtAuth");
const agtEndpoints_1 = require("./agtEndpoints");
const agtErrors_1 = require("./agtErrors");
/**
 * Cliente para a API de Facturação Eletrónica da AGT
 */
class AgtApiClient {
    constructor(options) {
        this.env = options.env;
        const timeoutMs = Number(process.env.AGT_TIMEOUT_MS || 90000);
        const httpsAgent = new https_1.default.Agent({
            keepAlive: true,
            minVersion: 'TLSv1.2',
            family: 4
        });
        this.client = axios_1.default.create({
            baseURL: (0, agtEndpoints_1.getAgtOrigin)(this.env),
            timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000,
            httpsAgent
        });
        this.logger = options.logger;
        this.isMock = options.isMock ?? false;
    }
    getHeadersForEndpoint(endpoint) {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    mapAxiosError(error) {
        if (this.logger) {
            const status = error?.response?.status;
            const errors = error?.response?.data ? (0, agtErrors_1.extractAgtErrorEntries)(error.response.data) : [];
            const errorCode = error?.code;
            const errorMessage = error?.message;
            this.logger.error({
                status,
                errorCode,
                errorMessage,
                agtErrors: errors.length ? errors : undefined,
            }, `Erro ao comunicar com a AGT`);
        }
        if (error?.response) {
            throw (0, agtErrors_1.buildAgtErrorFromHttpResponse)(error.response.status, error.response.data);
        }
        throw error;
    }
    /**
     * Regista uma factura ou rectificação na AGT
     */
    async registarFactura(request, apiToken) {
        const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
        if (mockEnabled) {
            return {
                requestID: `MOCK-${Date.now()}`,
                documentStatusList: request.documents.map((doc) => ({
                    documentNo: doc.documentNo,
                    documentStatus: 'V'
                }))
            };
        }
        try {
            const url = (0, agtEndpoints_1.getAgtEndpointPath)(this.env, 'registarFactura');
            const response = await this.client.post(url, request, {
                headers: {
                    ...this.getHeadersForEndpoint('registarFactura'),
                    'Authorization': (0, agtAuth_1.buildAgtBasicAuthHeaderValue)(apiToken)
                }
            });
            return response.data;
        }
        catch (error) {
            this.mapAxiosError(error);
        }
    }
    /**
     * Consulta o estado de uma submissão
     */
    async obterEstado(request, apiToken) {
        const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
        if (mockEnabled) {
            return {
                requestID: `MOCK-ST-${Date.now()}`,
                resultCode: '0',
                taxRegistrationNumber: request.taxRegistrationNumber,
                documentStatusList: []
            };
        }
        try {
            const url = (0, agtEndpoints_1.getAgtEndpointPath)(this.env, 'obterEstado');
            const response = await this.client.post(url, request, {
                headers: {
                    ...this.getHeadersForEndpoint('obterEstado'),
                    'Authorization': (0, agtAuth_1.buildAgtBasicAuthHeaderValue)(apiToken)
                }
            });
            return response.data;
        }
        catch (error) {
            if (this.logger)
                this.logger.error({ error, requestID: request.requestID }, `Erro ao obter estado na AGT`);
            this.mapAxiosError(error);
        }
    }
    /**
     * Lista faturas registradas num intervalo de tempo
     */
    async listarFacturas(request, apiToken) {
        const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
        if (mockEnabled) {
            return {
                documentListResult: {
                    documentResultCount: '0',
                    documentResultList: []
                }
            };
        }
        try {
            const url = (0, agtEndpoints_1.getAgtEndpointPath)(this.env, 'listarFacturas');
            const response = await this.client.post(url, request, {
                headers: {
                    ...this.getHeadersForEndpoint('listarFacturas'),
                    'Authorization': (0, agtAuth_1.buildAgtBasicAuthHeaderValue)(apiToken)
                }
            });
            return response.data;
        }
        catch (error) {
            if (this.logger)
                this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao listar faturas na AGT`);
            this.mapAxiosError(error);
        }
    }
    /**
     * Consulta os dados detalhados de uma fatura específica
     */
    async consultarFactura(request, apiToken) {
        const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
        if (mockEnabled) {
            const documentNo = request.documentNo || request.invoiceNo || '';
            return {
                documentNo,
                documentStatus: 'V',
                document: {
                    documentNo,
                    documentStatus: 'V',
                    documentType: 'FT',
                    documentDate: new Date().toISOString(),
                    systemEntryDate: new Date().toISOString(),
                    reportUrl: 'https://agt.minfin.gov.ao/mock-report',
                    costumerName: 'Cliente Mock',
                    customerTaxID: '999999999',
                    customerCountry: 'AO',
                    companyName: 'Empresa Mock',
                    softwareValidationNo: '123/AGT/2026',
                    documentTotals: {
                        taxPayable: '0.00',
                        netTotal: '0.00',
                        grossTotal: '0.00'
                    },
                    lines: []
                }
            };
        }
        try {
            const url = (0, agtEndpoints_1.getAgtEndpointPath)(this.env, 'consultarFactura');
            const response = await this.client.post(url, request, {
                headers: {
                    ...this.getHeadersForEndpoint('consultarFactura'),
                    'Authorization': (0, agtAuth_1.buildAgtBasicAuthHeaderValue)(apiToken)
                }
            });
            return response.data;
        }
        catch (error) {
            if (this.logger)
                this.logger.error({ error, documentNo: request.documentNo || request.invoiceNo }, `Erro ao consultar fatura na AGT`);
            this.mapAxiosError(error);
        }
    }
    /**
     * Solicita uma nova série de faturação à AGT
     */
    async solicitarSerie(request, apiToken) {
        const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
        if (mockEnabled) {
            return {
                resultCode: 1,
                seriesFEResult: {
                    seriesCode: 'CPLS-SR1',
                    authorizedQuantity: '1000',
                    firstDocumentNo: '1',
                    lastDocumentNo: '1000'
                }
            };
        }
        try {
            const url = (0, agtEndpoints_1.getAgtEndpointPath)(this.env, 'solicitarSerie');
            const response = await this.client.post(url, request, {
                headers: {
                    ...this.getHeadersForEndpoint('solicitarSerie'),
                    'Authorization': (0, agtAuth_1.buildAgtBasicAuthHeaderValue)(apiToken)
                }
            });
            return response.data;
        }
        catch (error) {
            if (this.logger)
                this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao solicitar série na AGT`);
            this.mapAxiosError(error);
        }
    }
    /**
     * Lista as séries de facturação registadas na AGT
     */
    async listarSeries(request, apiToken) {
        const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
        if (mockEnabled) {
            return {
                requestID: crypto_1.default.randomUUID(),
                resultCode: '0',
                taxRegistrationNumber: request.taxRegistrationNumber,
                documentStatusList: [
                    {
                        documentNo: `${request.seriesCode || 'CPLS-SR1'}-${request.documentType || 'FT'}-0001`,
                        documentStatus: 'A',
                        document: null
                    }
                ]
            };
        }
        try {
            const url = (0, agtEndpoints_1.getAgtEndpointPath)(this.env, 'listarSeries');
            const response = await this.client.post(url, request, {
                headers: {
                    ...this.getHeadersForEndpoint('listarSeries'),
                    'Authorization': (0, agtAuth_1.buildAgtBasicAuthHeaderValue)(apiToken)
                }
            });
            return response.data;
        }
        catch (error) {
            if (this.logger)
                this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao listar séries na AGT`);
            this.mapAxiosError(error);
        }
    }
    /**
     * Valida um documento na AGT (DS.120 v.4.7)
     */
    async validarDocumento(request, apiToken) {
        const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
        if (mockEnabled) {
            return {
                actionResultCode: 'C_OK',
                documentStatusCode: 'S_V'
            };
        }
        try {
            const url = (0, agtEndpoints_1.getAgtEndpointPath)(this.env, 'validarDocumento');
            const response = await this.client.post(url, request, {
                headers: {
                    ...this.getHeadersForEndpoint('validarDocumento'),
                    'Authorization': (0, agtAuth_1.buildAgtBasicAuthHeaderValue)(apiToken)
                }
            });
            return response.data;
        }
        catch (error) {
            if (this.logger)
                this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao validar documento na AGT`);
            this.mapAxiosError(error);
        }
    }
}
exports.AgtApiClient = AgtApiClient;
//# sourceMappingURL=AgtApiClient.js.map