import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../api/superadmin';
import toast from 'react-hot-toast';
import { ClinicaCreateInput } from '@clinicaplus/types';
import { AxiosError } from 'axios';
import { useSuperAdminStore } from '../stores/superadmin.store';
import { useAuthStore } from '../stores/auth.store';

export const superAdminKeys = {
  all: ['superadmin'] as const,
  dashboard: () => [...superAdminKeys.all, 'dashboard'] as const,
  stats: () => [...superAdminKeys.all, 'stats'] as const,
  clinicasList: (filters: Record<string, unknown> | undefined) => [...superAdminKeys.all, 'clinicas', filters] as const,
  users: () => [...superAdminKeys.all, 'users'] as const,
  usersList: (filters: Record<string, unknown> | undefined) => [...superAdminKeys.users(), filters] as const,
  logs: () => [...superAdminKeys.all, 'logs'] as const,
  logsList: (filters: Record<string, unknown> | undefined) => [...superAdminKeys.logs(), filters] as const,
  settings: () => [...superAdminKeys.all, 'settings'] as const,
  clinicas: () => [...superAdminKeys.all, 'clinicas_cache'] as const,
};

export function useGlobalStats() {
  return useQuery({
    queryKey: superAdminKeys.stats(),
    queryFn: superAdminApi.getStats,
    staleTime: 5 * 60 * 1000, 
  });
}

export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: superAdminKeys.dashboard(),
    queryFn: superAdminApi.getDashboard,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // Refresh cada minuto
  });
}

export function useSuperAdminClinicas(filters?: { page?: number; limit?: number; q?: string; plano?: string; ativo?: string }) {
  return useQuery({
    queryKey: superAdminKeys.clinicasList(filters),
    queryFn: () => superAdminApi.getClinicas(filters as Parameters<typeof superAdminApi.getClinicas>[0]),
    staleTime: 60 * 1000,
  });
}

export function useSuperAdminClinica(id: string) {
  return useQuery({
    queryKey: [...superAdminKeys.clinicas(), id],
    queryFn: () => superAdminApi.getClinica(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useImpersonar() {
  const navigate = useNavigate();
  const setSAStore = useSuperAdminStore(s => s.startImpersonation);

  return useMutation({
    mutationFn: ({ clinicaId, adminId, motivo }: { clinicaId: string; adminId: string; motivo: string }) => 
      superAdminApi.impersonar(clinicaId, adminId, motivo),
    onSuccess: (data) => {
      // Guardar sessão administrativa original e dados da clínica alvo
      setSAStore({ 
        token: data.token, 
        clinicaNome: data.clinicaNome, 
        expiresAt: new Date(data.expiracao) 
      });
      
      // Substituir token no authStore para as chamadas subsequentes
      useAuthStore.getState().setAccessToken(data.token);
      
      toast.success(`Modo Impersonation iniciado: ${data.clinicaNome}`);
      
      // Redirecionar para o dashboard da clínica (visão administrativa do tenant)
      navigate('/admin/dashboard');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(error.response?.data?.message || 'Erro ao iniciar modo impersonation.');
    }
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
      toast.error(error.response?.data?.message || 'Erro ao provisionar clínica.');
    }
  });
}

export function useUpdateClinica() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { ativo?: boolean; plano?: string } }) => 
      superAdminApi.updateClinica(id, data),
    onSuccess: () => {
      toast.success('Clínica atualizada com sucesso.');
      queryClient.invalidateQueries({ queryKey: superAdminKeys.clinicasList({}) });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar clínica.');
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

export function useHealthScores() {
  return useQuery({
    queryKey: ['sa-health-scores'],
    queryFn: () => superAdminApi.getHealthScores(),
    refetchInterval: 60 * 1000,
  });
}

export function useInfraStatus() {
  return useQuery({
    queryKey: ['sa-infra-status'],
    queryFn: () => superAdminApi.getInfraStatus(),
    refetchInterval: 30 * 1000,
  });
}

export function useMRR() {
  return useQuery({
    queryKey: ['sa-mrr'],
    queryFn: () => superAdminApi.getMRR(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlansDistribution() {
  return useQuery({
    queryKey: ['sa-plans'],
    queryFn: () => superAdminApi.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCohorts() {
  return useQuery({
    queryKey: ['sa-cohorts'],
    queryFn: () => superAdminApi.getCohorts(),
    staleTime: 30 * 60 * 1000,
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
