import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { agendamentosApi } from '../api/agendamentos';
import { useOnlineStatus } from './useOnlineStatus';
import { OfflineError } from '../lib/errors';
import { useOfflineStore } from '../stores/useOfflineStore';
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
    staleTime: 1000 * 60 * 5, // 5min
    gcTime: 1000 * 60 * 60 * 24, // 24h
    placeholderData: (prev) => prev, // Keep previous data visible
  });
}

export function useAgendamentosHoje(medicoId?: string) {
  return useQuery({
    queryKey: agendamentosKeys.hoje(medicoId),
    queryFn:  () => agendamentosApi.getHoje(medicoId),
    staleTime: 1000 * 60 * 5, // 5min
    gcTime: 1000 * 60 * 60 * 24, // 24h
    placeholderData: (prev) => prev,
  });
}

export function useMeusAgendamentos(query?: { estado?: EstadoAgendamento }) {
  return useQuery({
    queryKey: agendamentosKeys.meus(),
    queryFn:  () => agendamentosApi.getMeus(query),
    staleTime: 1000 * 60 * 5, // 5min
    gcTime: 1000 * 60 * 60 * 24, // 24h
    placeholderData: (prev) => prev,
  });
}

export function useAgendamento(id: string) {
  return useQuery({
    queryKey: agendamentosKeys.one(id),
    queryFn:  () => agendamentosApi.getOne(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10min (detalhes mudam pouco após criados)
    gcTime: 1000 * 60 * 60 * 24, // 24h
  });
}

export function useCreateAgendamento() {
  const qc = useQueryClient();
  const isOnline = useOnlineStatus();

  return useMutation({
    mutationFn: agendamentosApi.create,
    
    // Bloquear criação sem ligação à internet (C2)
    onMutate: () => {
      if (!isOnline) {
        throw new OfflineError('Não é possível marcar consultas sem ligação à internet.');
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agendamentosKeys.all() });
      toast.success('Agendamento criado com sucesso!');
    },

    onError: (err: unknown) => {
      // Caso seja erro de falta de rede (C2)
      if (err instanceof OfflineError) {
        toast.error(`${err.message} Liga-te à internet para marcar consultas.`, {
          duration: 5000,
        });
        return;
      }

      const error = err as { response?: { data?: { code?: string; message?: string } }; code?: string; message?: string };
      // Caso o horário já tenha sido ocupado por outro utilizador (C6)
      if (error.response?.data?.code === 'SLOT_TAKEN' || error.code === 'SLOT_TAKEN') {
        toast.error('Este horário já foi ocupado. Por favor escolha outro horário.');
        return;
      }

      toast.error('Erro ao criar agendamento: ' + (error.response?.data?.message || error.message));
    }
  });
}

export function useUpdateEstadoAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    // networkMode offlineFirst: pausa automaticamente offline, retoma quando online (C3)
    networkMode: 'offlineFirst',

    mutationFn: ({ id, estado, motivo }: { id: string; estado: EstadoAgendamento; motivo?: string }) =>
      agendamentosApi.updateEstado(id, estado, motivo),

    // Optimistic update: aplicar mudança IMEDIATAMENTE na UI (C3)
    onMutate: async ({ id, estado }) => {
      // Cancelar queries para evitar sobrescrever o update optimista
      await qc.cancelQueries({ queryKey: agendamentosKeys.all() });

      // Guardar estado anterior para rollback
      const prevData = qc.getQueryData(agendamentosKeys.hoje());

      // Aplicar mudança imediatamente no cache de 'hoje'
      qc.setQueryData(agendamentosKeys.hoje(), (old: unknown) => {
        const data = old as { items: Array<{ id: string; estado: EstadoAgendamento }> } | undefined;
        if (!data?.items) return old;
        return {
          ...data,
          items: data.items.map((ag) => 
            ag.id === id ? { ...ag, estado } : ag
          )
        };
      });

      return { prevData };
    },

    onSuccess: (updated) => {
      qc.setQueryData(agendamentosKeys.one(updated.id), updated);
      toast.success('Estado do agendamento actualizado!');
    },

    onError: (err: unknown, variables, context) => {
      // Rollback: restaurar estado anterior (C3)
      if (context?.prevData) {
        qc.setQueryData(agendamentosKeys.hoje(), context.prevData);
      }

      const error = err as { response?: { status?: number; data?: { message?: string } }; message: string };

      // Sprint D: Capturar conflitos 409
      if (error.response?.status === 409) {
        const mutation = qc.getMutationCache().getAll().find(
          m => m.options.mutationKey?.includes('update-status') && 
          JSON.stringify(m.state.variables) === JSON.stringify(variables)
        );
        
        if (mutation) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useOfflineStore.getState().addConflict(mutation as any, err);
        }
        
        toast.error('Conflito: este agendamento já foi alterado por outro utilizador.');
      } else {
        toast.error('Erro ao actualizar estado. A reverter...');
      }
    },

    onSettled: () => {
      // Sincronizar cache com o servidor (C3)
      qc.invalidateQueries({ queryKey: agendamentosKeys.lists() });
      qc.invalidateQueries({ queryKey: agendamentosKeys.hoje() });
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
