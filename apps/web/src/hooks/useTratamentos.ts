import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tratamentosApi } from '../api/tratamentos';

export function useTiposExameClinica() {
  return useQuery({
    queryKey: ['tratamentos', 'tipos-exames'],
    queryFn: () => tratamentosApi.getTiposExame(),
    staleTime: 60000, // Cache de 1 minuto conforme solicitado
  });
}

export function useTiposTratamentoClinica() {
  return useQuery({
    queryKey: ['tratamentos', 'tipos-tratamento'],
    queryFn: () => tratamentosApi.getTiposTratamento(),
    staleTime: 60000,
  });
}

export function useHistoricoClinico(pacienteId: string) {
  return useQuery({
    queryKey: ['pacientes', pacienteId, 'historico'],
    queryFn: async () => {
      // Importante: tratamentosApi.getExamesPaciente etc devem estar preparados para 404/vazio graciosamente.
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
    },
  });
}

export function useCriarPlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tratamentosApi.createPlano,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes', variables.pacienteId, 'historico'] });
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
    },
  });
}
