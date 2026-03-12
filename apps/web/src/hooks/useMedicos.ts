import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { medicosApi } from '../api/medicos';
import type { MedicoListQuery, MedicoUpdateInput, MedicoSelfUpdateInput } from '@clinicaplus/types';

export const medicosKeys = {
  all:   () => ['medicos'] as const,
  lists: () => [...medicosKeys.all(), 'list'] as const,
  list:  (q: MedicoListQuery) => [...medicosKeys.lists(), q] as const,
  one:   (id: string) => ['medicos', 'one', id] as const,
  me:    () => ['medicos', 'me'] as const,
  slots: (medicoId: string, data: string) => ['medicos', 'slots', medicoId, data] as const,
};

export function useMedicos(query: MedicoListQuery) {
  return useQuery({
    queryKey: medicosKeys.list(query),
    queryFn:  () => medicosApi.getList(query),
    staleTime: 300_000,
  });
}

export function useMedico(id: string) {
  return useQuery({
    queryKey: medicosKeys.one(id),
    queryFn:  () => medicosApi.getOne(id),
    enabled:  !!id,
    staleTime: 300_000,
  });
}

/** Fetches the authenticated médico's own profile. */
export function useMyProfile() {
  return useQuery({
    queryKey: medicosKeys.me(),
    queryFn:  () => medicosApi.getMe(),
    staleTime: 60_000,
  });
}

/** Mutation to update the authenticated médico's own profile (limited fields). */
export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicoSelfUpdateInput) => medicosApi.updateMe(data),
    onSuccess: (updated) => {
      qc.setQueryData(medicosKeys.me(), updated);
      qc.invalidateQueries({ queryKey: medicosKeys.one(updated.id) });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message: string };
      toast.error(error.response?.data?.error?.message || 'Erro ao atualizar o perfil.');
    },
  });
}

export function useSlots(medicoId: string, data: string) {
  return useQuery({
    queryKey: medicosKeys.slots(medicoId, data),
    queryFn:  () => medicosApi.getSlots(medicoId, data),
    enabled:  !!medicoId && !!data,
    staleTime: 0,
  });
}

export function useCreateMedico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: medicosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicosKeys.lists() });
      toast.success('Médico registado com sucesso!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao registar médico: ' + (error.response?.data?.message || error.message));
    }
  });
}

export function useUpdateMedico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MedicoUpdateInput }) =>
      medicosApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(medicosKeys.one(updated.id), updated);
      qc.invalidateQueries({ queryKey: medicosKeys.lists() });
      toast.success('Dados do médico actualizados!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao actualizar médico: ' + (error.response?.data?.message || error.message));
    }
  });
}
