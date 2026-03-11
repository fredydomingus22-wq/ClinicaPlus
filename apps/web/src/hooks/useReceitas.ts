import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receitasApi } from '../api/receitas';
import type { ReceitaListQuery } from '@clinicaplus/types';

export const receitasKeys = {
  all:   () => ['receitas'] as const,
  lists: () => [...receitasKeys.all(), 'list'] as const,
  list:  (q: ReceitaListQuery) => [...receitasKeys.lists(), q] as const,
  minhas: () => ['receitas', 'minhas'] as const,
  one:   (id: string) => ['receitas', 'one', id] as const,
};

export function useReceitas(query: ReceitaListQuery) {
  return useQuery({
    queryKey: receitasKeys.list(query),
    queryFn:  () => receitasApi.getList(query),
    staleTime: 60_000,
  });
}

export function useMinhasReceitas() {
  return useQuery({
    queryKey: receitasKeys.minhas(),
    queryFn:  () => receitasApi.getMinhas(),
    staleTime: 60_000,
  });
}

export function useReceita(id: string) {
  return useQuery({
    queryKey: receitasKeys.one(id),
    queryFn:  () => receitasApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: receitasApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: receitasKeys.lists() });
      qc.invalidateQueries({ queryKey: ['agendamentos'] }); // Prescription creation might affect appointment state/detail
    },
  });
}
