import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi } from '../api/superadmin';
import toast from 'react-hot-toast';
import { ClinicaCreateInput } from '@clinicaplus/types';
import { AxiosError } from 'axios';

export const superAdminKeys = {
  all: ['superadmin'] as const,
  stats: () => [...superAdminKeys.all, 'stats'] as const,
  users: () => [...superAdminKeys.all, 'users'] as const,
  usersList: (filters: Record<string, unknown> | undefined) => [...superAdminKeys.users(), filters] as const,
  logs: () => [...superAdminKeys.all, 'logs'] as const,
  logsList: (filters: Record<string, unknown> | undefined) => [...superAdminKeys.logs(), filters] as const,
  settings: () => [...superAdminKeys.all, 'settings'] as const,
  clinicas: () => [...superAdminKeys.all, 'clinicas'] as const,
};

export function useGlobalStats() {
  return useQuery({
    queryKey: superAdminKeys.stats(),
    queryFn: superAdminApi.getStats,
    staleTime: 5 * 60 * 1000, 
  });
}

export function useProvisionClinica() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClinicaCreateInput) => superAdminApi.provisionClinica(data),
    onSuccess: () => {
      toast.success('Clínica provisionada com sucesso!');
      queryClient.invalidateQueries({ queryKey: superAdminKeys.clinicas() });
      queryClient.invalidateQueries({ queryKey: superAdminKeys.stats() });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message = error.response?.data?.message || 'Erro ao provisionar clínica.';
      toast.error(message);
    }
  });
}

export function useGlobalUsers(filters?: { page?: number | undefined; limit?: number | undefined; q?: string | undefined; papel?: string | undefined; ativo?: string | undefined }) {
  return useQuery({
    queryKey: superAdminKeys.usersList(filters),
    queryFn: () => superAdminApi.getGlobalUsers(filters),
    staleTime: 60 * 1000,
  });
}

export function useUpdateGlobalUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => superAdminApi.updateUserStatus(id, ativo),
    onSuccess: (data: { nome: string; ativo: boolean }) => {
      toast.success(`Conta ${data.nome} ${data.ativo ? 'ativada' : 'suspensa'} com sucesso.`);
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: superAdminKeys.users() });
    },
    onError: () => {
      toast.error('Ocorreu um erro ao atualizar o utilizador.');
    }
  });
}

export function useSystemLogs(filters?: { page?: number | undefined; limit?: number | undefined; q?: string | undefined; nivel?: string | undefined }) {
  return useQuery({
    queryKey: superAdminKeys.logsList(filters),
    queryFn: () => superAdminApi.getSystemLogs(filters),
    staleTime: 30 * 1000,
  });
}

export function useGlobalSettings() {
  return useQuery({
    queryKey: superAdminKeys.settings(),
    queryFn: superAdminApi.getGlobalSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateGlobalSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof superAdminApi.updateGlobalSettings>[0]) => superAdminApi.updateGlobalSettings(data),
    onSuccess: () => {
      toast.success('Configurações globais atualizadas com sucesso.');
      queryClient.invalidateQueries({ queryKey: superAdminKeys.settings() });
    },
    onError: () => {
      toast.error('Erro ao atualizar configurações globais.');
    }
  });
}
