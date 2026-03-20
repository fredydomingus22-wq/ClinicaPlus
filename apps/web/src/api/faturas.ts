import { apiClient } from './client';
import type { 
  FaturaDTO, 
  FaturaCreateInput, 
  PaginatedResult,
  EstadoFatura,
  PagamentoCreateSchema
} from '@clinicaplus/types';
import { z } from 'zod';

export type PagamentoInput = z.infer<typeof PagamentoCreateSchema>;

export const faturasApi = {
  getList: (params: { estado?: EstadoFatura; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResult<FaturaDTO>>('/faturas', { params })
      .then(r => r.data),

  getOne: (id: string) =>
    apiClient.get<FaturaDTO>(`/faturas/${id}`)
      .then(r => r.data),

  create: (data: FaturaCreateInput) =>
    apiClient.post<FaturaDTO>('/faturas', data)
      .then(r => r.data),

  emitir: (id: string) =>
    apiClient.patch<FaturaDTO>(`/faturas/${id}/emitir`)
      .then(r => r.data),

  anular: (id: string, motivo: string) =>
    apiClient.patch<FaturaDTO>(`/faturas/${id}/anular`, { motivo })
      .then(r => r.data),

  registarPagamento: (data: PagamentoInput) =>
    apiClient.post(`/faturas/${data.faturaId}/pagamentos`, data)
      .then(r => r.data),

  submeterSeguro: (pagamentoId: string) =>
    apiClient.patch(`/faturas/pagamentos/${pagamentoId}/submeter-seguro`)
      .then(r => r.data),

  registarRespostaSeguro: (pagamentoId: string, data: { estado: 'APROVADO' | 'REJEITADO', valorAprovado?: number, notas?: string }) =>
    apiClient.patch(`/faturas/pagamentos/${pagamentoId}/registar-resposta-seguro`, data)
      .then(r => r.data),
};
