import { useQuery, useMutation } from '@tanstack/react-query';
import { relatoriosApi } from '../api/relatorios';

export interface RelatorioFilters {
  inicio?: string | undefined;
  fim?: string | undefined;
  agrupamento?: string | undefined;
  medicoId?: string | undefined;
  tipo?: string | undefined;
}

export const relatoriosKeys = {
  all: ['relatorios'] as const,
  receita: (filters: RelatorioFilters) => [...relatoriosKeys.all, 'receita', filters] as const,
};

export function useRelatorioReceita(filters: RelatorioFilters) {
  return useQuery({
    queryKey: relatoriosKeys.receita(filters),
    queryFn: () => relatoriosApi.getReceita(filters),
  });
}

export function useExportReceita() {
  return useMutation({
    mutationFn: (filters: Omit<RelatorioFilters, 'agrupamento'>) => 
      relatoriosApi.exportReceita(filters),
  });
}

export function useMapaFaturacao(filters: Omit<RelatorioFilters, 'agrupamento' | 'tipo'>) {
  return useQuery({
    queryKey: ['relatorios', 'mapa-faturacao', filters],
    queryFn: () => relatoriosApi.getMapaFaturacao(filters),
    enabled: false, // Manual trigger
  });
}
