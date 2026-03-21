import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface LimiteInfo {
  maximo: number;
  actual: number;
  percentagem: number | null;
}

/** Shape returned by GET /subscricoes/actual */
export interface SubscricaoActual {
  plano: string;
  estado: string;
  diasRestantes: number;
  validaAte: string | null;
  limites: {
    medicos: LimiteInfo;
    consultas: LimiteInfo;
    pacientes: LimiteInfo;
    apiKeys: LimiteInfo;
  };
  features: Record<string, boolean | string>;
}

/** Shape returned by GET /subscricoes/uso */
export interface SubscricaoUso {
  medicos: LimiteInfo;
  consultas: LimiteInfo;
  pacientes: LimiteInfo;
  apiKeys: LimiteInfo;
}

/** Shape returned by GET /subscricoes/historico items */
export interface SubscricaoHistoricoItem {
  id: string;
  plano: string;
  estado: string;
  criadoEm: string;
  valorKz?: number;
}

/** Combined hook used by SubscricaoPage */
export function useBilling() {
  const subscricaoActual = useQuery<SubscricaoActual>({
    queryKey: ['subscricoes', 'actual'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SubscricaoActual }>('/subscricoes/actual');
      return response.data.data;
    },
  });

  const subscricaoUso = useQuery<SubscricaoUso>({
    queryKey: ['subscricoes', 'uso'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SubscricaoUso }>('/subscricoes/uso');
      return response.data.data;
    },
  });

  const historicoQuery = useQuery<SubscricaoHistoricoItem[]>({
    queryKey: ['subscricoes', 'historico'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SubscricaoHistoricoItem[] }>('/subscricoes/historico');
      return response.data.data;
    },
  });

  const defaultLimite = { maximo: 0, actual: 0, percentagem: 0 };
  const defaultLimites = {
    medicos: defaultLimite,
    consultas: defaultLimite,
    pacientes: defaultLimite,
    apiKeys: defaultLimite,
  };

  return {
    subscricaoActual: subscricaoActual.data || {
      plano: '---',
      estado: '---',
      diasRestantes: 0,
      validaAte: null,
      limites: defaultLimites,
      features: {}
    } as SubscricaoActual,
    subscricaoUso: subscricaoUso.data || defaultLimites as unknown as SubscricaoUso,
    historico: historicoQuery.data || [],
    isLoading: subscricaoActual.isLoading || subscricaoUso.isLoading || historicoQuery.isLoading,
  };
}

/** Legacy hook — kept for ConfiguracaoPage compatibility.
 *  Maps to GET /subscricoes/actual and returns a shape similar to the old billing API.
 */
export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['subscricoes', 'actual'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SubscricaoActual }>('/subscricoes/actual');
      const d = response.data.data;
      return {
        plano: d.plano,
        status: d.estado,
        proximaFatura: d.validaAte,
      };
    },
  });
}

/** Legacy hook — kept for ConfiguracaoPage compatibility.
 *  Maps to GET /subscricoes/historico and returns a shape similar to the old billing API.
 */
export function useBillingHistory() {
  return useQuery({
    queryKey: ['subscricoes', 'historico'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SubscricaoHistoricoItem[] }>('/subscricoes/historico');
      return response.data.data.map(item => ({
        id: item.id,
        numero: item.id.slice(0, 8).toUpperCase(),
        dataEmissao: item.criadoEm,
        valor: item.valorKz ?? 0,
        status: item.estado === 'ACTIVA' ? 'PAGO' : item.estado,
      }));
    },
  });
}
