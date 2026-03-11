import { apiClient } from './client';
import { NotificacaoDTO, ApiResponse } from '@clinicaplus/types';

export const notificacoesApi = {
  list: async (): Promise<NotificacaoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<NotificacaoDTO[]>>('/notificacoes');
    return data.data || [];
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notificacoes/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notificacoes/read-all');
  },
};
