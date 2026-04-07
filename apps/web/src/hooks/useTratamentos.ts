import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tratamentosApi } from '../api/tratamentos';

export function useTiposExameClinica() {
  return useQuery({
    queryKey: ['tratamentos', 'tipos-exames'],
    queryFn: () => tratamentosApi.getTiposExame(),
    staleTime: 60000, 
  });
}

export function useTiposTratamentoClinica() {
  return useQuery({
    queryKey: ['tratamentos', 'tipos-tratamento'],
    queryFn: () => tratamentosApi.getTiposTratamento(),
    staleTime: 60000,
  });
}

export function useExamesClinica(filters: { estado?: string | undefined; q?: string | undefined } = {}) {
  return useQuery({
    queryKey: ['tratamentos', 'exames', 'list', filters],
    queryFn: () => tratamentosApi.getAllExames(filters),
  });
}

export function useExamesPaciente(pacienteId: string) {
  return useQuery({
    queryKey: ['tratamentos', 'exames', 'paciente', pacienteId],
    queryFn: () => tratamentosApi.getExamesPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function usePlanosClinica(filters: { estado?: string | undefined; q?: string | undefined } = {}) {
  return useQuery({
    queryKey: ['tratamentos', 'planos', 'list', filters],
    queryFn: () => tratamentosApi.getAllPlanos(filters),
  });
}

export function useHistoricoClinico(pacienteId: string) {
  return useQuery({
    queryKey: ['pacientes', pacienteId, 'historico'],
    queryFn: async () => {
      const [exames, planos] = await Promise.all([
        tratamentosApi.getExamesPaciente(pacienteId),
        tratamentosApi.getPlanosPaciente(pacienteId),
      ]);
      return { exames, planos };
    },
    enabled: !!pacienteId,
  });
}

// Mutações
export function useCriarExame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tratamentosApi.createExame,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes', variables.pacienteId, 'historico'] });
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'exames', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'exames', 'paciente', variables.pacienteId] });
    },
  });
}

export function useCriarPlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tratamentosApi.createPlano,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes', variables.pacienteId, 'historico'] });
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'planos', 'list'] });
    },
  });
}

export function useConfirmarLaudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, path }: { id: string; path: string; pacienteId: string }) => 
      tratamentosApi.confirmLaudo(id, path),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes', variables.pacienteId, 'historico'] });
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'exames', 'paciente', variables.pacienteId] });
    },
  });
}

export function useCriarTipoExame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tratamentosApi.createTipoExame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'tipos-exames'] });
    },
  });
}

export function useCriarTipoTratamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tratamentosApi.createTipoTratamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'tipos-tratamento'] });
    },
  });
}
