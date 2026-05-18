import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface BotIntegracaoDTO {
  id?: string;
  clinicaId?: string;
  instanciaId: string | null;
  provedor: 'TYPEBOT' | 'DIALOGFLOW' | 'N8N' | 'DIFY';
  apiUrl: string | null;
  flowId: string | null;
  apiToken: string | null;
  variaveisGlobais: Record<string, string | number | boolean>;
  triggerKeyword: string | null;
  expireTime: number;
  unknownMessage: string | null;
  ativo: boolean;
}

export function useBotIntegracao(instanciaId?: string | null) {
  return useQuery({
    queryKey: ['botIntegracao', instanciaId],
    queryFn: async () => {
      // Usar a rota relativa porque a path base já está na apiClient (/api)
      const { data } = await apiClient.get<BotIntegracaoDTO | null>('/bots');
      return data;
    }
  });
}

export function useSaveBotIntegracao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<BotIntegracaoDTO>) => {
      const { data } = await apiClient.post<BotIntegracaoDTO>('/bots', payload);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['botIntegracao', variables.instanciaId] });
      queryClient.invalidateQueries({ queryKey: ['bot-integracao'] });
    },
  });
}
