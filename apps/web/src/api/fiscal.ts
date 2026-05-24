import { apiClient as api } from './client';

export interface FiscalStats {
  totalFaturas: number;
  faturasEntregues: number;
  faturasPendentes: number;
  faturasErro: number;
  ultimoSafExport?: string;
}

export interface ConfiguracaoFiscalInput {
  tipoEntidade?: 'SINGULAR' | 'EMPRESA' | undefined;
  nif?: string | undefined;
  razaoSocial?: string | undefined;
  enderecoPostal?: string | undefined;
  regimeFiscal?: 'GERAL' | 'SIMPLIFICADO' | 'EXUSA' | undefined;
  serieDocFiscal?: string | undefined;
  agtPrivateKey?: string | undefined;
  agtPublicKey?: string | undefined;
}

/**
 * View-model da configuração fiscal vinda do backend.
 * Por segurança, o backend NÃO devolve os segredos (token/chaves).
 */
export type ConfiguracaoFiscalView = Omit<
  ConfiguracaoFiscalInput,
  'agtPrivateKey' | 'agtPublicKey'
> & {
  id: string;
  agtPrivateKeyConfigured?: boolean;
  agtPublicKeyConfigured?: boolean;
};

export interface TestarConexaoResult {
  success: boolean;
  message: string;
}

export interface AgtHistoricoItem {
  submissionUUID: string;
  submissionTimeStamp: string;
  documentNo: string;
  customerTaxID: string;
  totalWithoutTax: number | null;
  taxAmount: number | null;
  grossTotal: number | null;
  hasPartialData: boolean;
}

export interface AgtHistoricoResponse {
  items: AgtHistoricoItem[];
  documentListResult?: unknown;
  statusResult?: unknown;
}

export interface AgtConsultaFacturaResponse {
  documentNo?: string;
  documentStatus?: string;
  validationStatus?: string;
  document?: {
    documentNo?: string;
    documentType?: string;
    documentDate?: string;
    customerTaxID?: string;
    companyName?: string;
    documentTotals?: {
      netTotal?: string;
      taxPayable?: string;
      grossTotal?: string;
    };
  };
  errorList?: Array<{ idError: string; descriptionError: string }>;
}

export const fiscalApi = {
  /**
   * Obtém estatísticas fiscais gerais
   */
  async getStats(): Promise<FiscalStats> {
    const response = await api.get('/fiscal/stats');
    return response.data;
  },

  /**
   * Obtém a configuração fiscal actual da clínica (campos do modelo Clinica)
   */
  async getConfiguracao(): Promise<ConfiguracaoFiscalView> {
    const response = await api.get<{ data: ConfiguracaoFiscalView }>('/clinicas/me');
    return response.data.data;
  },

  /**
   * Guarda a configuração fiscal (campos fiscais do modelo Clinica)
   */
  async saveConfiguracao(data: ConfiguracaoFiscalInput) {
    const response = await api.patch<{ data: ConfiguracaoFiscalInput }>('/clinicas/me', data);
    return response.data.data;
  },

  /**
   * Testa a conexão com a API AGT usando as credenciais configuradas
   */
  async testarConexao(): Promise<TestarConexaoResult> {
    const response = await api.post<TestarConexaoResult>('/fiscal/testar-conexao');
    return response.data;
  },

  /**
   * Exporta o ficheiro SAF-T AO
   */
  async exportSaft(dataInicio: string, dataFim: string): Promise<Blob> {
    const response = await api.get('/fiscal/saft', {
      params: { inicio: dataInicio, fim: dataFim },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Força a submissão de uma fatura pendente
   */
  async resubmitInvoice(faturaId: string): Promise<void> {
    await api.post(`/fiscal/invoice/${faturaId}/resubmit`);
  },

  /**
   * Lista séries da AGT
   */
  async listarSeries() {
    const response = await api.get('/fiscal/series');
    return response.data;
  },

  /**
   * Solicita nova série à AGT
   * Nota: serieCode e authorizedQuantity são determinados pela AGT com base no documentType
   */
  async solicitarSerie(data: { documentType: string; establishmentNumber?: string }) {
    const response = await api.post('/fiscal/series/solicitar', data);
    return response.data;
  },

  /**
   * Lista histórico de faturas registadas na AGT
   */
  async listarHistoricoAgt(startDate: string, endDate: string): Promise<AgtHistoricoResponse> {
    const response = await api.post('/fiscal/listar-facturas-agt', { startDate, endDate });
    const payload = response.data ?? {};
    const documentListResult = payload.documentListResult;
    const statusResult = payload.statusResult;

    const fromDocumentList = Array.isArray(documentListResult?.documentResultList)
      ? documentListResult.documentResultList.map((row: { documentNo: string; documentDate: string }) => ({
          submissionUUID: row.documentNo,
          submissionTimeStamp: row.documentDate,
          documentNo: row.documentNo,
          customerTaxID: '-',
          totalWithoutTax: null,
          taxAmount: null,
          grossTotal: null,
          hasPartialData: true,
        }))
      : [];

    const fromStatusResult = Array.isArray(statusResult?.resultEntryList)
      ? statusResult.resultEntryList.map((entry: { documentEntryResult: { id?: string; documentNo: string; documentDate: string; netTotal?: string } }) => ({
          submissionUUID: entry.documentEntryResult.id || entry.documentEntryResult.documentNo,
          submissionTimeStamp: entry.documentEntryResult.documentDate,
          documentNo: entry.documentEntryResult.documentNo,
          customerTaxID: '-',
          totalWithoutTax: entry.documentEntryResult.netTotal ? Number(entry.documentEntryResult.netTotal) : null,
          taxAmount: null,
          grossTotal: entry.documentEntryResult.netTotal ? Number(entry.documentEntryResult.netTotal) : null,
          hasPartialData: !entry.documentEntryResult.netTotal,
        }))
      : [];

    return {
      ...payload,
      items: fromDocumentList.length ? fromDocumentList : fromStatusResult
    };
  },

  /**
   * Consulta uma fatura específica na AGT pelo número
   */
  async consultarFaturaAgt(numero: string): Promise<AgtConsultaFacturaResponse> {
    const response = await api.post<AgtConsultaFacturaResponse>('/fiscal/consultar-factura-agt', { documentNo: numero });
    return response.data;
  },

  /**
   * Valida um documento local contra a AGT
   */
  async validarDocumentoAgt(faturaId: string) {
    const response = await api.post(`/fiscal/validar-documento-agt/${faturaId}`);
    return response.data;
  },

  /**
   * Audita a integridade da sequência de hashes (Hash chain)
   */
  async auditHashChain() {
    const response = await api.get('/fiscal/audit/hash-chain');
    return response.data;
  },
};
