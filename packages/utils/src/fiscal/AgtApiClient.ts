import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
  AgtListSeriesResponse 
} from './types';

/**
 * Cliente para a API de Facturação Eletrónica da AGT
 */
export class AgtApiClient {
  private client: AxiosInstance;
  private logger: Logger | undefined;
  private isMock: boolean;

  constructor(baseURL: string, logger?: Logger, isMock: boolean = false) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    this.logger = logger;
    this.isMock = isMock;
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
      const response = await this.client.post('/registarFactura', request, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Username': request.taxRegistrationNumber,
          'Password': apiToken
        }
      });
      return response.data;
    } catch (error) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao registar factura na AGT`);
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
      const response = await this.client.post('/obterEstado', request, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Username': request.taxRegistrationNumber,
          'Password': apiToken
        }
      });
      return response.data;
    } catch (error) {
      if (this.logger) this.logger.error({ error, requestID: request.requestID }, `Erro ao obter estado da AGT`);
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
          'Authorization': `Bearer ${apiToken}`,
          'Username': request.taxRegistrationNumber,
          'Password': apiToken
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
          'Authorization': `Bearer ${apiToken}`,
          'Username': request.taxRegistrationNumber,
          'Password': apiToken
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
        resultCode: '0',
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
          'Authorization': `Bearer ${apiToken}`,
          'Username': request.taxRegistrationNumber,
          'Password': apiToken
        }
      });
      return response.data;
    } catch (error) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao solicitar série na AGT`);
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
          'Authorization': `Bearer ${apiToken}`,
          'Username': request.taxRegistrationNumber,
          'Password': apiToken
        }
      });
      return response.data;
    } catch (error) {
      if (this.logger) this.logger.error({ error, nif: request.taxRegistrationNumber }, `Erro ao listar séries na AGT`);
      throw error;
    }
  }
}

export const agtApiClient: AgtApiClient = new AgtApiClient(process.env.VITE_API_URL || 'http://localhost:3001');
