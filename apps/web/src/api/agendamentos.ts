import { apiClient } from './client';
import type { 
  AgendamentoDTO, 
  AgendamentoCreateInput, 
  AgendamentoListQuery, 
  EstadoAgendamento, 
  PaginatedResult, 
  TriagemInput,
  ConsultaInput
} from '@clinicaplus/types';

export const agendamentosApi = {
  getList: (query: AgendamentoListQuery) =>
    apiClient.get<{ data: PaginatedResult<AgendamentoDTO> }>('/agendamentos', { params: query })
      .then(r => r.data.data),

  getHoje: (medicoId?: string) =>
    apiClient.get<{ data: AgendamentoDTO[] }>('/agendamentos/hoje', { params: { medicoId } })
      .then(r => r.data.data),

  getMeus: (query?: { estado?: EstadoAgendamento }) =>
    apiClient.get<{ data: PaginatedResult<AgendamentoDTO> }>('/agendamentos/meus', { params: query })
      .then(r => r.data.data),

  getOne: (id: string) =>
    apiClient.get<{ data: AgendamentoDTO }>(`/agendamentos/${id}`)
      .then(r => r.data.data),

  create: (data: AgendamentoCreateInput) =>
    apiClient.post<{ data: AgendamentoDTO }>('/agendamentos', data)
      .then(r => r.data.data),

  updateEstado: (id: string, estado: EstadoAgendamento, motivo?: string) =>
    apiClient.patch<{ data: AgendamentoDTO }>(`/agendamentos/${id}/estado`, { estado, motivo })
      .then(r => r.data.data),

  triagem: (id: string, data: TriagemInput) =>
    apiClient.patch<{ data: AgendamentoDTO }>(`/agendamentos/${id}/triagem`, data)
      .then(r => r.data.data),

  consulta: (id: string, data: ConsultaInput) =>
    apiClient.patch<{ data: AgendamentoDTO }>(`/agendamentos/${id}/consulta`, data)
      .then(r => r.data.data),
};
