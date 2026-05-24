import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { buildAgtBasicAuthHeaderValue } from './agtAuth';
import { type AgtEnv, getAgtEndpointPath, getAgtOrigin } from './agtEndpoints';
import { buildAgtErrorFromHttpResponse, extractAgtErrorEntries } from './agtErrors';
import {
  Logger,
  AgtElectronicInvoiceRequest,
  AgtApiResponse,
  AgtStatusRequest,
  AgtStatusResponse,
  AgtListRequest,
  AgtListResponse,
  AgtConsultRequest,
  AgtConsultResponse,
  AgtSeriesRequest,
  AgtSeriesResponse,
  AgtListSeriesRequest,
  AgtListSeriesResponse,
  AgtValidateDocumentRequest,
  AgtValidateDocumentResponse,
  AgtError
} from './types';

/**
 * Cliente para a API de Facturação Eletrónica da AGT
 */
export class AgtApiClient {
  private client: AxiosInstance;
  private logger: Logger | undefined;
  private isMock: boolean;
  private env: AgtEnv;

  constructor(options: { env: AgtEnv; logger?: Logger; isMock?: boolean }) {
    this.env = options.env;

    const timeoutMs = Number(process.env.AGT_TIMEOUT_MS || 90000);
    const httpsAgent = new https.Agent({
      keepAlive: true,
      minVersion: 'TLSv1.2',
      family: 4
    });

    this.client = axios.create({
      baseURL: getAgtOrigin(this.env),
      timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000,
      httpsAgent
    });
    this.logger = options.logger;
    this.isMock = options.isMock ?? false;
  }

  private getHeadersForEndpoint(endpoint: string) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  private mapAxiosError(error: any): never {
    if (this.logger) {
      const status = error?.response?.status;
      const errors = error?.response?.data ? extractAgtErrorEntries(error.response.data) : [];
      const errorCode = error?.code;
      const errorMessage = error?.message;
      this.logger.error(
        {
          status,
          errorCode,
          errorMessage,
          agtErrors: errors.length ? errors : undefined,
        },
        `Erro ao comunicar com a AGT`
      );
    }
    if (error?.response) {
      throw buildAgtErrorFromHttpResponse(error.response.status, error.response.data);
    }
    throw error;
  }

  /**
   * Regista uma factura ou rectificação na AGT
   */
  public async registarFactura(request: AgtElectronicInvoiceRequest, apiToken: string): Promise<AgtApiResponse> {
    const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
    if (mockEnabled) {
      return { 
        requestID: `MOCK-${Date.now()}`,
        documentStatusList: request.documents.map((doc: any) => ({
          documentNo: doc.documentNo,
          documentStatus: 'V'
        }))
      };
    }

    try {
      const url = getAgtEndpointPath(this.env, 'registarFactura');

      const response = await this.client.post(url, request, {
        headers: {
          ...this.getHeadersForEndpoint('registarFactura'),
          'Authorization': buildAgtBasicAuthHeaderValue(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      this.mapAxiosError(error);
    }
  }

  /**
   * Consulta o estado de uma submissão
   */
  public async obterEstado(request: AgtStatusRequest, apiToken: string): Promise<AgtStatusResponse> {
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
      const url = getAgtEndpointPath(this.env, 'obterEstado');

      const response = await this.client.post(url, request, {
        headers: {
          ...this.getHeadersForEndpoint('obterEstado'),
          'Authorization': buildAgtBasicAuthHeaderValue(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, requestID: request.requestID }, `Erro ao obter estado na AGT`);
      this.mapAxiosError(error);
    }
  }

  /**
   * Lista faturas registradas num intervalo de tempo
   */
  public async listarFacturas(request: AgtListRequest, apiToken: string): Promise<AgtListResponse> {
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
      const url = getAgtEndpointPath(this.env, 'listarFacturas');

      const response = await this.client.post(url, request, {
        headers: {
          ...this.getHeadersForEndpoint('listarFacturas'),
          'Authorization': buildAgtBasicAuthHeaderValue(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao listar faturas na AGT`);
      this.mapAxiosError(error);
    }
  }

  /**
   * Consulta os dados detalhados de uma fatura específica
   */
  public async consultarFactura(request: AgtConsultRequest, apiToken: string): Promise<AgtConsultResponse> {
    const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
    if (mockEnabled) {
      const documentNo = request.invoiceNo || request.documentNo || '';
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
      const url = getAgtEndpointPath(this.env, 'consultarFactura');
      const response = await this.client.post(url, request, {
        headers: {
          ...this.getHeadersForEndpoint('consultarFactura'),
          'Authorization': buildAgtBasicAuthHeaderValue(apiToken)
        }
      });
      return response.data;
    } catch (error) {
      if (this.logger) this.logger.error({ error, documentNo: request.invoiceNo || request.documentNo }, `Erro ao consultar fatura na AGT`);
      this.mapAxiosError(error);
    }
  }

  /**
   * Solicita uma nova série de faturação à AGT
   */
  public async solicitarSerie(request: AgtSeriesRequest, apiToken: string): Promise<AgtSeriesResponse> {
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
      const url = getAgtEndpointPath(this.env, 'solicitarSerie');

      const response = await this.client.post(url, request, {
        headers: {
          ...this.getHeadersForEndpoint('solicitarSerie'),
          'Authorization': buildAgtBasicAuthHeaderValue(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao solicitar série na AGT`);
      this.mapAxiosError(error);
    }
  }

  /**
   * Lista as séries de facturação registadas na AGT
   */
  public async listarSeries(request: AgtListSeriesRequest, apiToken: string): Promise<AgtListSeriesResponse> {
    const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
    if (mockEnabled) {
      return {
        resultCode: '0',
        seriesResultCount: '1',
        seriesInfo: [
          {
            id: 'MOCK-ID-1',
            seriesCode: request.seriesCode || 'CPLS-SR1',
            seriesYear: request.seriesYear || '2026',
            seriesStatus: 'A',
            documentType: request.documentType || 'FT',
            seriesCreationDate: new Date().toISOString(),
            invoicingMethod: 'FESF',
            seriesContingencyIndicator: 'N',
            nif: request.taxRegistrationNumber,
            nome: 'ClinicaPlus Mock User'
          }
        ]
      };
    }

    try {
      const url = getAgtEndpointPath(this.env, 'listarSeries');
      const response = await this.client.post(url, request, {
        headers: {
          ...this.getHeadersForEndpoint('listarSeries'),
          'Authorization': buildAgtBasicAuthHeaderValue(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao listar séries na AGT`);
      this.mapAxiosError(error);
    }
  }

  /**
   * Valida um documento na AGT (DS.120 v.4.7)
   */
  public async validarDocumento(request: AgtValidateDocumentRequest, apiToken: string): Promise<AgtValidateDocumentResponse> {
    const mockEnabled = this.isMock || process.env.AGT_MOCK === 'true';
    if (mockEnabled) {
      return {
        actionResultCode: 'C_OK',
        documentStatusCode: 'S_V'
      };
    }

    try {
      const url = getAgtEndpointPath(this.env, 'validarDocumento');
      const response = await this.client.post(url, request, {
        headers: {
          ...this.getHeadersForEndpoint('validarDocumento'),
          'Authorization': buildAgtBasicAuthHeaderValue(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao validar documento na AGT`);
      this.mapAxiosError(error);
    }
  }
}
