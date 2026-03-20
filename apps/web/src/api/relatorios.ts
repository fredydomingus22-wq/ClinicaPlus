import { apiClient } from './client';

export interface RelatorioReceitaData {
  totais: {
    consultas: number;
    receita: number;
    segurosPendentes: number;
    mediaConsulta: number;
  };
  porMedico: Array<{
    nome: string;
    consultas: number;
    receita: number;
  }>;
  serie: Array<{
    periodo: string;
    medico_id: string | null;
    medico_nome: string | null;
    consultas: number;
    receita: number;
    seguros_pendentes: number;
  }>;
}

export const relatoriosApi = {
  getReceita: (params: { inicio?: string; fim?: string; agrupamento?: string; medicoId?: string; tipo?: string }) =>
    apiClient.get<{ success: boolean; data: RelatorioReceitaData }>('/relatorios/receita', { params })
      .then(r => r.data.data),

  exportReceita: (params: { inicio?: string; fim?: string; medicoId?: string; tipo?: string }) =>
    apiClient.get('/relatorios/receita/export', { params, responseType: 'blob' })
      .then(r => {
        const url = window.URL.createObjectURL(new Blob([r.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `relatorio-receita-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }),
};
