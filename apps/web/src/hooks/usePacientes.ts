import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { pacientesApi } from '../api/pacientes';
import type { PacienteUpdateInput, PacienteListQuery, PacienteDTO } from '@clinicaplus/types';
import { useOfflineStore } from '../stores/useOfflineStore';

export const pacientesKeys = {
  all:   () => ['pacientes'] as const,
  lists: () => [...pacientesKeys.all(), 'list'] as const,
  list:  (q: PacienteListQuery) => [...pacientesKeys.lists(), q] as const,
  one:   (id: string) => ['pacientes', 'one', id] as const,
  me:    () => ['pacientes', 'me'] as const,
};

export function useListaPacientes(query: PacienteListQuery) {
  return useQuery({
    queryKey: pacientesKeys.list(query),
    queryFn:  () => pacientesApi.getList(query),
    staleTime: 1000 * 60 * 10, // 10min
    gcTime: 1000 * 60 * 60 * 24, // 24h
    placeholderData: (prev) => prev,
  });
}

export function usePaciente(id: string) {
  return useQuery({
    queryKey: pacientesKeys.one(id),
    queryFn:  () => pacientesApi.getOne(id),
    enabled:  !!id,
    staleTime: 1000 * 60 * 10, // 10min
    gcTime: 1000 * 60 * 60 * 24, // 24h
  });
}

export function useCreatePaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pacientesApi.create,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: pacientesKeys.lists() });
      toast.success('Paciente registado com sucesso!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao registar paciente: ' + (error.response?.data?.message || error.message));
    }
  });
}

export function useUpdatePaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['pacientes', 'update'],
    networkMode: 'offlineFirst',
    mutationFn: ({ id, data }: { id: string; data: PacienteUpdateInput }) => 
      pacientesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: pacientesKeys.one(id) });
      const previous = qc.getQueryData(pacientesKeys.one(id));
      
      if (previous) {
        qc.setQueryData(pacientesKeys.one(id), (old: PacienteDTO | undefined) => old ? ({
          ...old,
          ...data
        }) : undefined);
      }
      
      return { previous };
    },
    onSuccess: (updated: PacienteDTO) => {
      qc.setQueryData(pacientesKeys.one(updated.id), updated);
      qc.invalidateQueries({ queryKey: pacientesKeys.lists() });
      toast.success('Dados do paciente actualizados!');
    },
    onError: (err: unknown, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(pacientesKeys.one(variables.id), context.previous);
      }
      
      const error = err as { response?: { status?: number; data?: { message?: string } }; message: string };
      
      // Sprint D: Capturar conflitos 409
      if (error.response?.status === 409) {
        const mutation = qc.getMutationCache().getAll().find(
          m => m.options.mutationKey?.includes('update') && 
          m.options.mutationKey?.includes('pacientes') &&
          JSON.stringify(m.state.variables) === JSON.stringify(variables)
        );
        
        if (mutation) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useOfflineStore.getState().addConflict(mutation as any, err);
        }
        toast.error('Conflito: outro utilizador já alterou este paciente.');
        return;
      }

      toast.error('Erro ao actualizar paciente: ' + (error.response?.data?.message || error.message));
    },
    onSettled: (data) => {
      if (data) {
        qc.invalidateQueries({ queryKey: pacientesKeys.one(data.id) });
        qc.invalidateQueries({ queryKey: pacientesKeys.lists() });
      }
    }
  });
}
