import { apiClient } from './client';
import type { 
  EspecialidadeDTO, 
  EspecialidadeCreateInput, 
  EspecialidadeUpdateInput, 
  EspecialidadeListQuery, 
  PaginatedResult,
  ApiResponse
} from '@clinicaplus/types';

export const especialidadesApi = {
  getList: (query: Partial<EspecialidadeListQuery> = {}) =>
    apiClient.get<ApiResponse<PaginatedResult<EspecialidadeDTO>>>('/especialidades', { params: query })
      .then(r => r.data.data!),

  getOne: (id: string) =>
    apiClient.get<ApiResponse<EspecialidadeDTO>>(`/especialidades/${id}`)
      .then(r => r.data.data!),

  create: (data: EspecialidadeCreateInput) =>
    apiClient.post<ApiResponse<EspecialidadeDTO>>('/especialidades', data)
      .then(r => r.data.data!),

  update: (id: string, data: EspecialidadeUpdateInput) =>
    apiClient.patch<ApiResponse<EspecialidadeDTO>>(`/especialidades/${id}`, data)
      .then(r => r.data.data!),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/especialidades/${id}`)
      .then(r => r.data.data!),
};
