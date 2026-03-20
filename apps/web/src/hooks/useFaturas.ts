import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { faturasApi, type PagamentoInput } from '../api/faturas';
import { EstadoFatura, FaturaCreateInput } from '@clinicaplus/types';

export const faturasKeys = {
  all: ['faturas'] as const,
  lists: () => [...faturasKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...faturasKeys.lists(), filters] as const,
  details: () => [...faturasKeys.all, 'detail'] as const,
  detail: (id: string) => [...faturasKeys.details(), id] as const,
};

export function useFaturas(filters: { estado?: EstadoFatura; page?: number; limit?: number }) {
  return useQuery({
    queryKey: faturasKeys.list(filters),
    queryFn: () => faturasApi.getList(filters),
  });
}

export function useFatura(id: string) {
  return useQuery({
    queryKey: faturasKeys.detail(id),
    queryFn: () => faturasApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateFatura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FaturaCreateInput) => faturasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faturasKeys.lists() });
    },
  });
}

export function useEmitirFatura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faturasApi.emitir(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: faturasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: faturasKeys.detail(id) });
    },
  });
}

export function useAnularFatura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => faturasApi.anular(id, motivo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: faturasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: faturasKeys.detail(variables.id) });
    },
  });
}

export function useRegistarPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PagamentoInput) => faturasApi.registarPagamento(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: faturasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: faturasKeys.detail(variables.faturaId) });
    },
  });
}

export function useSubmeterSeguro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pagamentoId: string) => faturasApi.submeterSeguro(pagamentoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faturasKeys.all });
    },
  });
}

export function useRegistarRespostaSeguro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pagamentoId, ...data }: { pagamentoId: string, estado: 'APROVADO' | 'REJEITADO', valorAprovado?: number, notas?: string }) => 
      faturasApi.registarRespostaSeguro(pagamentoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faturasKeys.all });
    },
  });
}
