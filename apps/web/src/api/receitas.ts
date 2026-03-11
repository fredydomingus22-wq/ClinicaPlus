import { apiClient } from './client';
import type { 
  ReceitaDTO, 
  ReceitaCreateInput, 
  ReceitaListQuery, 
  PaginatedResult 
} from '@clinicaplus/types';

export const receitasApi = {
  getList: (query: ReceitaListQuery) =>
    apiClient.get<{ data: PaginatedResult<ReceitaDTO> }>('/receitas', { params: query })
      .then(r => r.data.data),

  getMinhas: () =>
    apiClient.get<{ data: ReceitaDTO[] }>('/receitas/minhas')
      .then(r => r.data.data),

  getOne: (id: string) =>
    apiClient.get<{ data: ReceitaDTO }>(`/receitas/${id}`)
      .then(r => r.data.data),

  create: (data: ReceitaCreateInput) =>
    apiClient.post<{ data: ReceitaDTO }>('/receitas', data)
      .then(r => r.data.data),
};
