import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AtualizarSessaoDto, Papel } from '@clinicaplus/types';
import { tratamentosApi } from '../api/tratamentos';
import { agendamentosApi } from '../api/agendamentos';
import { useAuthStore } from '../stores/auth.store';

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

export function usePlanosPaciente(pacienteId: string) {
  return useQuery({
    queryKey: ['tratamentos', 'planos', 'paciente', pacienteId],
    queryFn: () => tratamentosApi.getPlanosPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useTratamento(id: string) {
  return useQuery({
    queryKey: ['tratamentos', 'planos', 'detail', id],
    queryFn: () => tratamentosApi.getPlanoById(id),
    enabled: !!id,
  });
}

export function useHistoricoClinico(pacienteId: string) {
  const { utilizador } = useAuthStore();
  
  return useQuery({
    queryKey: ['pacientes', pacienteId, 'historico'],
    queryFn: async () => {
      const isPaciente = utilizador?.papel === Papel.PACIENTE;

      const [exames, planos, agendamentos] = await Promise.all([
        tratamentosApi.getExamesPaciente(pacienteId),
        tratamentosApi.getPlanosPaciente(pacienteId),
        isPaciente 
          ? agendamentosApi.getMeus({ page: 1, limit: 100 })
          : agendamentosApi.getList({ page: 1, limit: 100, pacienteId })
      ]);
      return { 
        exames, 
        planos, 
        consultas: agendamentos.items 
      };
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

export function useDeleteTipoExame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tratamentosApi.deleteTipoExame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'tipos-exames'] });
    },
  });
}

export function useDeleteTipoTratamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tratamentosApi.deleteTipoTratamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'tipos-tratamento'] });
    },
  });
}

export function useUpdateSessao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AtualizarSessaoDto }) => 
      tratamentosApi.updateSessao(id, payload),
    onSuccess: () => {
      // Invalida o detalhe do plano para atualizar o progresso
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'planos', 'detail'] });
      // Também pode invalidar a listagem global se necessário
      queryClient.invalidateQueries({ queryKey: ['tratamentos', 'planos', 'list'] });
    },
  });
}
