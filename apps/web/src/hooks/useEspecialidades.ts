import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { especialidadesApi } from '../api/especialidades';
import type { 
  EspecialidadeCreateInput,
  EspecialidadeUpdateInput, 
  EspecialidadeListQuery, 
} from '@clinicaplus/types';
import { useUIStore } from '../stores/ui.store';
import { getApiErrorMessage } from '../lib/errorUtils';

export const especialidadesKeys = {
  all: () => ['especialidades'] as const,
  lists: () => [...especialidadesKeys.all(), 'list'] as const,
  list: (q: Partial<EspecialidadeListQuery>) => [...especialidadesKeys.lists(), q] as const,
  one: (id: string) => [...especialidadesKeys.all(), 'one', id] as const,
};

export function useEspecialidades(query: Partial<EspecialidadeListQuery> = {}) {
  return useQuery({
    queryKey: especialidadesKeys.list(query),
    queryFn: () => especialidadesApi.getList(query),
    staleTime: 300_000, // 5 minutes (standard for settings)
  });
}

export function useCreateEspecialidade() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (data: EspecialidadeCreateInput) => especialidadesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: especialidadesKeys.lists() });
      addToast({ type: 'success', title: 'Sucesso', message: 'Especialidade criada com sucesso' });
    },
    onError: (error: Error) => {
      addToast({ type: 'error', title: 'Erro', message: getApiErrorMessage(error) });
    }
  });
}

export function useUpdateEspecialidade() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EspecialidadeUpdateInput }) => 
      especialidadesApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: especialidadesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: especialidadesKeys.one(updated.id) });
      // Also invalidate medicos because they depend on specialty data for display
      queryClient.invalidateQueries({ queryKey: ['medicos'] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Especialidade atualizada com sucesso' });
    },
    onError: (error: Error) => {
      addToast({ type: 'error', title: 'Erro', message: getApiErrorMessage(error) });
    }
  });
}

export function useDeleteEspecialidade() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => especialidadesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: especialidadesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['medicos'] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Especialidade removida com sucesso' });
    },
    onError: (error: Error) => {
      addToast({ type: 'error', title: 'Erro', message: getApiErrorMessage(error) });
    }
  });
}
