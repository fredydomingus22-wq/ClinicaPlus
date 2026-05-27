import { apiClient } from './client';
import type { FaturaDTO } from '@clinicaplus/types';

export interface RelatorioReceitaData {
  totais: {
    consultas: number;
    receita: number;
    totalIva: number;
    receitaPrevista: number;
    rascunhos: number;
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

export interface MapaFaturacaoData {
  inicio: string;
  fim: string;
  faturas: FaturaDTO[];
  totalFaturado: number;
  totalIva: number;
  totalDescontos: number;
}

export const relatoriosApi = {
  getReceita: (params: { inicio?: string | undefined; fim?: string | undefined; agrupamento?: string | undefined; medicoId?: string | undefined; tipo?: string | undefined }) => {
    // Backend reads "agruparPor", not "agrupamento"
    const { agrupamento, ...rest } = params;
    return apiClient.get<{ success: boolean; data: RelatorioReceitaData }>('/relatorios/receita', {
      params: { ...rest, agruparPor: agrupamento }
    }).then(r => r.data.data);
  },

  exportReceita: (params: { inicio?: string | undefined; fim?: string | undefined; medicoId?: string | undefined; tipo?: string | undefined }) =>
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

  getMapaFaturacao: (params: { inicio?: string | undefined; fim?: string | undefined; medicoId?: string | undefined }) =>
    apiClient.get<{ success: boolean; data: MapaFaturacaoData }>('/relatorios/mapa-faturacao', { params })
      .then(r => r.data.data),
};
