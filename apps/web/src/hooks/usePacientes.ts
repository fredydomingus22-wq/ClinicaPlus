import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { pacientesApi } from '../api/pacientes';
import type { PacienteUpdateInput, PacienteListQuery } from '@clinicaplus/types';

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
    staleTime: 30_000,
  });
}

export function usePaciente(id: string) {
  return useQuery({
    queryKey: pacientesKeys.one(id),
    queryFn:  () => pacientesApi.getOne(id),
    enabled:  !!id,
    staleTime: 60_000,
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
    mutationFn: ({ id, data }: { id: string; data: PacienteUpdateInput }) => 
      pacientesApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(pacientesKeys.one(updated.id), updated);
      qc.invalidateQueries({ queryKey: pacientesKeys.lists() });
      toast.success('Dados do paciente actualizados!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao actualizar paciente: ' + (error.response?.data?.message || error.message));
    }
  });
}
