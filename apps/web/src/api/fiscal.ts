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
  agtApiToken?: string | undefined;
  agtPrivateKey?: string | undefined;
  agtPublicKey?: string | undefined;
}

export interface TestarConexaoResult {
  success: boolean;
  message: string;
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
  async getConfiguracao() {
    const response = await api.get<{ data: ConfiguracaoFiscalInput & { id: string } }>('/clinicas/me');
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
   */
  async solicitarSerie(data: { serieCode: string; authorizedQuantity: number; documentType: string }) {
    const response = await api.post('/fiscal/series/solicitar', data);
    return response.data;
  },

  /**
   * Lista histórico de faturas registadas na AGT
   */
  async listarHistoricoAgt(startDate: string, endDate: string) {
    const response = await api.post('/fiscal/listar-facturas-agt', { startDate, endDate });
    return response.data;
  },

  /**
   * Consulta uma fatura específica na AGT pelo número
   */
  async consultarFaturaAgt(numero: string) {
    const response = await api.get(`/fiscal/consultar-factura-agt/${numero}`);
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
