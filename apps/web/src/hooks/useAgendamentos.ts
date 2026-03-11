import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { agendamentosApi } from '../api/agendamentos';
import type { 
  AgendamentoListQuery, 
  EstadoAgendamento, 
  TriagemInput,
  ConsultaInput
} from '@clinicaplus/types';

export const agendamentosKeys = {
  all:   () => ['agendamentos'] as const,
  lists: () => [...agendamentosKeys.all(), 'list'] as const,
  list:  (q: AgendamentoListQuery) => [...agendamentosKeys.lists(), q] as const,
  hoje:  (medicoId?: string) => ['agendamentos', 'hoje', { medicoId }] as const,
  meus:  () => ['agendamentos', 'meus'] as const,
  one:   (id: string) => ['agendamentos', 'one', id] as const,
};

export function useListaAgendamentos(query: AgendamentoListQuery) {
  return useQuery({
    queryKey: agendamentosKeys.list(query),
    queryFn:  () => agendamentosApi.getList(query),
    staleTime: 30_000, // 30s — serves cached data instantly on re-entry, refetches in background
    placeholderData: (prev) => prev, // Keep previous data visible during page changes
  });
}

export function useAgendamentosHoje(medicoId?: string) {
  return useQuery({
    queryKey: agendamentosKeys.hoje(medicoId),
    queryFn:  () => agendamentosApi.getHoje(medicoId),
    staleTime: 0,
    refetchInterval: 60_000, // Refresh every minute for reception
  });
}

export function useMeusAgendamentos(query?: { estado?: EstadoAgendamento }) {
  return useQuery({
    queryKey: agendamentosKeys.meus(),
    queryFn:  () => agendamentosApi.getMeus(query),
    staleTime: 30_000,
  });
}

export function useAgendamento(id: string) {
  return useQuery({
    queryKey: agendamentosKeys.one(id),
    queryFn:  () => agendamentosApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agendamentosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agendamentosKeys.all() });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao criar agendamento: ' + (error.response?.data?.message || error.message));
    }
  });
}

export function useUpdateEstadoAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado, motivo }: { id: string; estado: EstadoAgendamento; motivo?: string }) =>
      agendamentosApi.updateEstado(id, estado, motivo),
    onSuccess: (updated) => {
      qc.setQueryData(agendamentosKeys.one(updated.id), updated);
      qc.invalidateQueries({ queryKey: agendamentosKeys.lists() });
      qc.invalidateQueries({ queryKey: agendamentosKeys.hoje() });
      toast.success('Estado do agendamento actualizado!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao actualizar estado: ' + (error.response?.data?.message || error.message));
    }
  });
}

export function useTriagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TriagemInput }) => 
      agendamentosApi.triagem(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(agendamentosKeys.one(updated.id), updated);
      qc.invalidateQueries({ queryKey: agendamentosKeys.lists() });
      qc.invalidateQueries({ queryKey: agendamentosKeys.hoje() });
      toast.success('Triagem concluída com sucesso!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao realizar triagem: ' + (error.response?.data?.message || error.message));
    }
  });
}

export function useConsulta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConsultaInput }) => 
      agendamentosApi.consulta(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(agendamentosKeys.one(updated.id), updated);
      qc.invalidateQueries({ queryKey: agendamentosKeys.lists() });
      qc.invalidateQueries({ queryKey: agendamentosKeys.hoje() });
      toast.success('Consulta finalizada com sucesso!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message: string };
      toast.error('Erro ao processar consulta: ' + (error.response?.data?.message || error.message));
    }
  });
}
