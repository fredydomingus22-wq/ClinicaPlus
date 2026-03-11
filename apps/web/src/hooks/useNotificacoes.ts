import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacoesApi } from '../api/notificacoes';

export function useNotificacoes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notificacoes'],
    queryFn: notificacoesApi.list,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsRead = useMutation({
    mutationFn: notificacoesApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: notificacoesApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });

  const unreadCount = query.data?.filter(n => !n.lida).length || 0;

  return {
    notificacoes: query.data || [],
    isLoading: query.isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
