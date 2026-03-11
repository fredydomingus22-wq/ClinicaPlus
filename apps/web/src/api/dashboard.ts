import { apiClient } from './client';
import type { 
  DashboardStats, 
  MedicoDashboardDTO 
} from '@clinicaplus/types';

export const dashboardApi = {
  getStats: (periodo: 'hoje' | 'semana' | 'mes' = 'hoje') =>
    apiClient.get<{ data: DashboardStats }>('/dashboard/stats', { params: { periodo } })
      .then(r => r.data.data),

  getMedicoStats: () =>
    apiClient.get<{ data: MedicoDashboardDTO }>('/dashboard/medico')
      .then(r => r.data.data),

  getConsultasPorDia: () =>
    apiClient.get<{ data: { label: string; value: number }[] }>('/dashboard/consultas-por-dia')
      .then(r => r.data.data),
};
