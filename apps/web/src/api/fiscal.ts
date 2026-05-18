import { apiClient as api } from './client';

export interface FiscalStats {
  totalFaturas: number;
  faturasEntregues: number;
  faturasPendentes: number;
  faturasErro: number;
  ultimoSafExport?: string;
}

export interface ConfiguracaoFiscalInput {
  nif?: string | undefined;
  razaoSocial?: string | undefined;
  enderecoPostal?: string | undefined;
  regimeFiscal?: 'GERAL' | 'SIMPLIFICADO' | 'EXUSA' | undefined;
  serieDocFiscal?: string | undefined;
  agtApiToken?: string | undefined;
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
   * Testa a conexão com a API AGT usando o token configurado
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
      params: { dataInicio, dataFim },
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
};
