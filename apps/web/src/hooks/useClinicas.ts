import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { clinicasApi } from '../api/clinicas';
import type { ClinicaUpdateInput, ContactoClinicaInput } from '@clinicaplus/types';

export const clinicasKeys = {
  all: () => ['clinicas'] as const,
  me:  () => [...clinicasKeys.all(), 'me'] as const,
};

export function useClinicaMe() {
  return useQuery({
    queryKey: clinicasKeys.me(),
    queryFn:  () => clinicasApi.getMe(),
    staleTime: 600_000, // Clinic details don't change often
  });
}

export function useUpdateClinicaMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClinicaUpdateInput) => clinicasApi.updateMe(data),
    onSuccess: (updated) => {
      qc.setQueryData(clinicasKeys.me(), updated);
      qc.invalidateQueries({ queryKey: clinicasKeys.all() });
      toast.success('Dados da clínica actualizados!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao actualizar clínica: ' + (error.response?.data?.message || error.message));
    }
  });
}

export function useUpdateClinicaContactos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactos: ContactoClinicaInput[]) => clinicasApi.updateContactos(contactos),
    onSuccess: (updated) => {
      qc.setQueryData(clinicasKeys.me(), updated);
      toast.success('Contactos da clínica actualizados!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao actualizar contactos: ' + (error.response?.data?.message || error.message));
    }
  });
}
