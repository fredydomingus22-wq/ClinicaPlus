import { apiClient } from './client';
import type { 
  MedicoDTO, 
  MedicoCreateInput,
  MedicoUpdateInput,
  MedicoListQuery, 
  PaginatedResult 
} from '@clinicaplus/types';

export const medicosApi = {
  getList: (query: MedicoListQuery) =>
    apiClient.get<{ data: PaginatedResult<MedicoDTO> }>('/medicos', { params: query })
      .then(r => r.data.data),

  getOne: (id: string) =>
    apiClient.get<{ data: MedicoDTO }>(`/medicos/${id}`)
      .then(r => r.data.data),

  getSlots: (medicoId: string, data: string) =>
    apiClient.get<{ data: { slots: string[] } }>(`/medicos/${medicoId}/slots`, { params: { data } })
      .then(r => r.data.data.slots),

  create: (data: MedicoCreateInput) =>
    apiClient.post<{ data: MedicoDTO }>('/medicos', data).then(r => r.data.data),

  update: (id: string, data: MedicoUpdateInput) =>
    apiClient.patch<{ data: MedicoDTO }>(`/medicos/${id}`, data).then(r => r.data.data),
};
