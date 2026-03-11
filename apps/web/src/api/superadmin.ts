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

  getClinicas: (params?: { q?: string | undefined; page?: number | undefined; limit?: number | undefined }) =>
    api.get<{ data: PaginatedResult<ClinicaDTO> }>('/superadmin/clinicas', { params }).then((res: AxiosResponse) => res.data.data),

  updateClinica: (id: string, data: { ativo?: boolean; plano?: string }) =>
    api.patch<{ data: ClinicaDTO }>(`/superadmin/clinicas/${id}`, data).then((res: AxiosResponse) => res.data.data),

  provisionClinica: (data: ClinicaCreateInput) =>
    api.post<{ data: ClinicaDTO }>('/superadmin/clinicas', data).then((res: AxiosResponse) => res.data.data)
};
