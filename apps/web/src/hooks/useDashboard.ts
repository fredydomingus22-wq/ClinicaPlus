import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';

export const dashboardKeys = {
  stats:  (periodo: string) => ['dashboard', 'stats', periodo] as const,
  medico: () => ['dashboard', 'medico'] as const,
  consultasPorDia: () => ['dashboard', 'consultasPorDia'] as const,
};

/** Admin dashboard stats — cached 60s for instant re-navigation */
export function useDashboardStats(periodo: 'hoje' | 'semana' | 'mes' = 'hoje') {
  return useQuery({
    queryKey: dashboardKeys.stats(periodo),
    queryFn:  () => dashboardApi.getStats(periodo),
    staleTime: 60_000,  // 60s — instant on re-entry
    gcTime:    300_000,  // 5min — stays in cache even after unmount
  });
}

/** Medico dashboard stats */
export function useDashboardMedico() {
  return useQuery({
    queryKey: dashboardKeys.medico(),
    queryFn:  () => dashboardApi.getMedicoStats(),
    staleTime: 60_000,
    gcTime:    300_000,
  });
}

/** Consultas por dia (last 7 days) for bar chart */
export function useConsultasPorDia() {
  return useQuery({
    queryKey: dashboardKeys.consultasPorDia(),
    queryFn:  () => dashboardApi.getConsultasPorDia(),
    staleTime: 120_000,  // 2min — chart data doesn't change fast
    gcTime:    300_000,
  });
}
