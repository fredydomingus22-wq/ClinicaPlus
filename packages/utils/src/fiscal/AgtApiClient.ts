import axios, { AxiosInstance, AxiosResponse } from 'axios';
import https from 'https';
import { AppError } from '../errors';
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
  private isSandbox: boolean;

  constructor(baseURL: string, logger?: Logger, isMock: boolean = false) {
    // Definir URLs base oficiais da AGT
    const isSandbox = baseURL.includes('sandbox') || baseURL.includes('hml') || !baseURL.includes('sifp.minfin.gov.ao');
    this.isSandbox = isSandbox;
    const officialBaseURL = isSandbox 
      ? 'https://sifphml.minfin.gov.ao/sigt/fe/ws/v1' 
      : 'https://sifp.minfin.gov.ao/sigt/fe/v1';

    const timeoutMs = Number(process.env.AGT_TIMEOUT_MS || 90000);
    const httpsAgent = new https.Agent({
      keepAlive: true,
      minVersion: 'TLSv1.2',
      family: 4
    });

    this.client = axios.create({
      baseURL: officialBaseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000,
      httpsAgent
    });
    this.logger = logger;
    this.isMock = isMock;
  }

  /**
   * Constrói o header de autorização (Basic Auth)
   */
  private getAuthHeader(auth: string): string {
    if (!auth) return '';
    if (auth.startsWith('Basic ')) return auth;
    
    // Se contiver ':' tratamos como user:pass e convertemos para base64
    if (auth.includes(':')) {
      const b64 = typeof Buffer !== 'undefined' 
        ? Buffer.from(auth).toString('base64')
        : btoa(auth);
      return `Basic ${b64}`;
    }

    // Caso contrário, assumimos que já é o valor base64 ou token directo
    return `Basic ${auth}`;
  }

  /**
   * Regista uma factura ou rectificação na AGT
   */
  public async registarFactura(request: AgtElectronicInvoiceRequest, apiToken: string): Promise<AgtApiResponse> {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    const mockEnabled = this.isMock || env.AGT_MOCK === 'true';
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
      const registarUrl = this.isSandbox
        ? 'https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura'
        : '/registarFactura';

      const response = await this.client.post(registarUrl, request, {
        headers: {
          'Authorization': this.getAuthHeader(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao admitir facturas na AGT`);
      
      if (error.response) {
        throw AgtError.fromStatus(error.response.status, error.response.data?.idError);
      }
      throw error;
    }
  }

  /**
   * Consulta o estado de uma submissão
   */
  public async obterEstado(request: AgtStatusRequest, apiToken: string): Promise<AgtStatusResponse> {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    const mockEnabled = this.isMock || env.AGT_MOCK === 'true';
    if (mockEnabled) {
      return {
        requestID: `MOCK-ST-${Date.now()}`,
        resultCode: '0',
        taxRegistrationNumber: request.taxRegistrationNumber,
        documentStatusList: []
      };
    }

    try {
      const statusUrl = this.isSandbox
        ? 'https://sifphml.minfin.gov.ao/sigt/fe/v1/obterEstado'
        : '/obterEstado';

      const response = await this.client.post(statusUrl, request, {
        headers: {
          'Authorization': this.getAuthHeader(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, requestID: request.requestID }, `Erro ao obter estado na AGT`);
      
      if (error.response) {
        throw AgtError.fromStatus(error.response.status, error.response.data?.idError);
      }
      throw error;
    }
  }

  /**
   * Lista faturas registradas num intervalo de tempo
   */
  public async listarFacturas(request: AgtListRequest, apiToken: string): Promise<AgtListResponse> {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    const mockEnabled = this.isMock || env.AGT_MOCK === 'true';
    if (mockEnabled) {
      return {
        statusResult: {
          documentResultCount: '0',
          resultEntryList: []
        }
      };
    }

    try {
      const response = await this.client.post('/listarFacturas', request, {
        headers: {
          'Authorization': this.getAuthHeader(apiToken)
        }
      });
      return response.data;
    } catch (error) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao listar faturas na AGT`);
      throw error;
    }
  }

  /**
   * Consulta os dados detalhados de uma fatura específica
   */
  public async consultarFactura(request: AgtConsultRequest, apiToken: string): Promise<AgtConsultResponse> {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    const mockEnabled = this.isMock || env.AGT_MOCK === 'true';
    if (mockEnabled) {
      return {
        documentNo: request.invoiceNo,
        documentStatus: 'V',
        document: {
          documentNo: request.invoiceNo,
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
      const response = await this.client.post('/consultarFactura', request, {
        headers: {
          'Authorization': this.getAuthHeader(apiToken)
        }
      });
      return response.data;
    } catch (error) {
      if (this.logger) this.logger.error({ error, invoiceNo: request.invoiceNo }, `Erro ao consultar fatura na AGT`);
      throw error;
    }
  }

  /**
   * Solicita uma nova série de faturação à AGT
   */
  public async solicitarSerie(request: AgtSeriesRequest, apiToken: string): Promise<AgtSeriesResponse> {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    const mockEnabled = this.isMock || env.AGT_MOCK === 'true';
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
      const response = await this.client.post('/solicitarSerie', request, {
        headers: {
          'Authorization': this.getAuthHeader(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao solicitar série na AGT`);
      
      if (error.response) {
        throw AgtError.fromStatus(error.response.status, error.response.data?.idError);
      }
      throw error;
    }
  }

  /**
   * Lista as séries de facturação registadas na AGT
   */
  public async listarSeries(request: AgtListSeriesRequest, apiToken: string): Promise<AgtListSeriesResponse> {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    const mockEnabled = this.isMock || env.AGT_MOCK === 'true';
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
      const response = await this.client.post('/listarSeries', request, {
        headers: {
          'Authorization': this.getAuthHeader(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao listar séries na AGT`);
      
      if (error.response) {
        throw AgtError.fromStatus(error.response.status, error.response.data?.idError);
      }
      throw error;
    }
  }

  /**
   * Valida um documento na AGT (DS.120 v.4.7)
   */
  public async validarDocumento(request: AgtValidateDocumentRequest, apiToken: string): Promise<AgtValidateDocumentResponse> {
    const env = typeof globalThis !== 'undefined' && (globalThis as any).process ? (globalThis as any).process.env : {};
    const mockEnabled = this.isMock || env.AGT_MOCK === 'true';
    if (mockEnabled) {
      return {
        actionResultCode: 'C_OK',
        documentStatusCode: 'S_V'
      };
    }

    try {
      const response = await this.client.post('/validarDocumento', request, {
        headers: {
          'Authorization': this.getAuthHeader(apiToken)
        }
      });
      return response.data;
    } catch (error: any) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao validar documento na AGT`);
      
      if (error.response) {
        throw AgtError.fromStatus(error.response.status, error.response.data?.idError);
      }
      throw error;
    }
  }
}

export const agtApiClient: AgtApiClient = new AgtApiClient(process.env.VITE_API_URL || 'http://localhost:3001');
