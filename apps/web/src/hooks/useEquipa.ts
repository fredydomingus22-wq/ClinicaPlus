import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipaApi } from '../api/equipa';
import type { UtilizadorListQuery, EquipaCreateInput, UtilizadorUpdateInput } from '@clinicaplus/types';

export const EQUIPA_KEYS = {
  all: ['equipa'] as const,
  lists: () => [...EQUIPA_KEYS.all, 'list'] as const,
  list: (params: UtilizadorListQuery) => [...EQUIPA_KEYS.lists(), params] as const,
  details: () => [...EQUIPA_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...EQUIPA_KEYS.details(), id] as const,
};

export function useEquipa(params: UtilizadorListQuery) {
  return useQuery({
    queryKey: EQUIPA_KEYS.list(params),
    queryFn: () => equipaApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateEquipa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EquipaCreateInput) => equipaApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPA_KEYS.lists() });
    },
  });
}

export function useUpdateEquipa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UtilizadorUpdateInput }) => equipaApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EQUIPA_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EQUIPA_KEYS.detail(variables.id) });
    },
  });
}
