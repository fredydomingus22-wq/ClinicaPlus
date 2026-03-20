import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '../api/api-keys';
import { ApiKeyCreateInput } from '@clinicaplus/types';
import { toast } from 'react-hot-toast';

export const apiKeysKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeysKeys.all, 'list'] as const,
};

export function useApiKeys() {
  return useQuery({
    queryKey: apiKeysKeys.lists(),
    queryFn: apiKeysApi.getList,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApiKeyCreateInput) => apiKeysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysKeys.lists() });
      toast.success('Chave API criada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar chave API');
    }
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysKeys.lists() });
      toast.success('Chave API revogada');
    },
    onError: () => {
      toast.error('Erro ao revogar chave API');
    }
  });
}
