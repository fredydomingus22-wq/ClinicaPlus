import { AxiosResponse } from 'axios';
import { ClinicaDTO, PaginatedResult, SystemLogDTO, GlobalSettingsDTO, ClinicaCreateInput } from '@clinicaplus/types';
export type { SystemLogDTO };
import { apiClient as api } from './client';

export interface GlobalUserDTO {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  criadoEm: string;
  clinicaId: string;
  clinicaNome: string;
}

export interface PaginatedUsersResponse {
  items: GlobalUserDTO[];
  total: number;
  page: number;
  limit: number;
}

export const superAdminApi = {
  getStats: () => api.get<{ data: { totalClinicas: number; totalUtilizadores: number; totalAgendamentos: number; totalRevenue: number } }>('/superadmin/stats').then((res: AxiosResponse) => res.data.data),
  
  getGlobalUsers: (params?: { page?: number | undefined; limit?: number | undefined; q?: string | undefined; papel?: string | undefined; ativo?: string | undefined }) => 
    api.get<{ data: PaginatedUsersResponse }>('/superadmin/users', { params }).then((res: AxiosResponse) => res.data.data),
    
  updateUserStatus: (id: string, ativo: boolean) =>
    api.patch<{ data: GlobalUserDTO }>(`/superadmin/users/${id}`, { ativo }).then((res: AxiosResponse) => res.data.data),

  getSystemLogs: (params?: { page?: number | undefined; limit?: number | undefined; q?: string | undefined; nivel?: string | undefined }) => 
    api.get<{ data: PaginatedResult<SystemLogDTO> }>('/superadmin/logs', { params }).then((res: AxiosResponse) => res.data.data),

  getGlobalSettings: () => 
    api.get<{ data: GlobalSettingsDTO }>('/superadmin/settings').then((res: AxiosResponse) => res.data.data),

  updateGlobalSettings: (data: Partial<GlobalSettingsDTO>) =>
    api.patch<{ data: GlobalSettingsDTO }>('/superadmin/settings', data).then((res: AxiosResponse) => res.data.data),

  getClinicas: (params?: { q?: string; page?: number; limit?: number; plano?: string; ativo?: string }) =>
    api.get<{ data: PaginatedResult<ClinicaDTO> }>('/superadmin/clinicas', { params }).then((res: AxiosResponse) => res.data.data),

  getClinica: (id: string) =>
    api.get<{ data: ClinicaDTO }>(`/superadmin/clinicas/${id}`).then((res: AxiosResponse) => res.data.data),

  updateClinica: (id: string, data: { ativo?: boolean; plano?: string }) =>
    api.patch<{ data: ClinicaDTO }>(`/superadmin/clinicas/${id}`, data).then((res: AxiosResponse) => res.data.data),

  provisionClinica: (data: ClinicaCreateInput) =>
    api.post<{ data: ClinicaDTO }>('/superadmin/clinicas', data).then((res: AxiosResponse) => res.data.data),

  getDashboard: () =>
    api.get<{ data: unknown }>('/superadmin/dashboard').then((res: AxiosResponse) => res.data.data),

  getHealthScores: () =>
    api.get<{ data: { clinicaId: string; nome: string; score: string; erros24h: number }[] }>('/superadmin/observabilidade/saude').then((res: AxiosResponse) => res.data.data),

  getInfraStatus: () =>
    api.get<{ data: { services: { name: string; status: string; latency?: number; details?: string }[]; lastUpdate: string } }>('/superadmin/observabilidade/infraestrutura').then((res: AxiosResponse) => res.data.data),

  getMRR: () =>
    api.get<{ data: { current: number; previous: number; growth: number; trend: { month: string; value: number }[] } }>('/superadmin/financeiro/mrr').then((res: AxiosResponse) => res.data.data),

  getPlans: () =>
    api.get<{ data: { id: string; nome: string; preco: number; totalClinicas: number; revenue: number }[] }>('/superadmin/financeiro/planos').then((res: AxiosResponse) => res.data.data),

  getCohorts: () =>
    api.get<{ data: { month: string; data: number[] }[] }>('/superadmin/financeiro/cohorts').then((res: AxiosResponse) => res.data.data),

  getFeatureFlags: () =>
    api.get<{ data: { id: string; codigo: string; descricao: string; ativo: boolean }[] }>('/superadmin/sistema/feature-flags').then((res: AxiosResponse) => res.data.data),

  updateFeatureFlag: (codigo: string, ativo: boolean) =>
    api.patch<{ data: { codigo: string; ativo: boolean } }>(`/superadmin/sistema/feature-flags/${codigo}`, { ativo }).then((res: AxiosResponse) => res.data.data),

  getImpersonationHistory: () =>
    api.get<{ data: unknown[] }>('/superadmin/impersonar/historico').then((res: AxiosResponse) => res.data.data),

  impersonar: (clinicaId: string, adminId: string, motivo: string) =>
    api.post<{ data: { token: string; expiracao: string; clinicaNome: string } }>('/superadmin/impersonar', { clinicaId, adminId, motivo }).then((res: AxiosResponse) => res.data.data)
};
