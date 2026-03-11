import { apiClient } from './client';
import type { 
  PacienteDTO, 
  PacienteCreateInput, 
  PacienteUpdateInput, 
  PacienteListQuery, 
  PaginatedResult 
} from '@clinicaplus/types';

export const pacientesApi = {
  getList: (query: PacienteListQuery) =>
    apiClient.get<{ data: PaginatedResult<PacienteDTO> }>('/pacientes', { params: query })
      .then(r => r.data.data),

  getOne: (id: string) =>
    apiClient.get<{ data: PacienteDTO }>(`/pacientes/${id}`)
      .then(r => r.data.data),

  create: (data: PacienteCreateInput) =>
    apiClient.post<{ data: PacienteDTO }>('/pacientes', data)
      .then(r => r.data.data),

  update: (id: string, data: PacienteUpdateInput) =>
    apiClient.patch<{ data: PacienteDTO }>(`/pacientes/${id}`, data)
      .then(r => r.data.data),

  getMe: () =>
    apiClient.get<{ data: PacienteDTO }>('/pacientes/me')
      .then(r => r.data.data),
};
