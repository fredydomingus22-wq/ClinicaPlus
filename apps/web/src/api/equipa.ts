import { apiClient } from './client';
import type { UtilizadorDTO, EquipaCreateInput, UtilizadorUpdateInput, UtilizadorListQuery, PaginatedResult } from '@clinicaplus/types';

export const equipaApi = {
  list: (params: UtilizadorListQuery) => 
    apiClient.get<{ data: PaginatedResult<UtilizadorDTO> }>('/equipa', { params }).then(r => r.data.data),

  getOne: (id: string) => 
    apiClient.get<{ data: UtilizadorDTO }>(`/equipa/${id}`).then(r => r.data.data),

  create: (data: EquipaCreateInput) => 
    apiClient.post<{ data: UtilizadorDTO }>('/equipa', data).then(r => r.data.data),

  update: (id: string, data: UtilizadorUpdateInput) => 
    apiClient.patch<{ data: UtilizadorDTO }>(`/equipa/${id}`, data).then(r => r.data.data),
};
