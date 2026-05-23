import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { odontogramaApi } from '../api/odontograma';
import type { OdontogramaCreateInput, OdontogramaUpdateInput } from '@clinicaplus/types';

export const odontogramaKeys = {
  all: () => ['odontogramas'] as const,
  byAgendamento: (id: string) => [...odontogramaKeys.all(), 'agendamento', id] as const,
  byPaciente: (id: string) => [...odontogramaKeys.all(), 'paciente', id] as const,
};

export function useOdontogramaByAgendamento(agendamentoId: string) {
  return useQuery({
    queryKey: odontogramaKeys.byAgendamento(agendamentoId),
    queryFn: () => odontogramaApi.getByAgendamento(agendamentoId),
    enabled: !!agendamentoId,
  });
}

export function useOdontogramaByPaciente(pacienteId: string) {
  return useQuery({
    queryKey: odontogramaKeys.byPaciente(pacienteId),
    queryFn: () => odontogramaApi.getByPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCreateOdontograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OdontogramaCreateInput) => odontogramaApi.create(payload),
    onSuccess: (data) => {
      qc.setQueryData(odontogramaKeys.byAgendamento(data.agendamentoId), data);
      qc.invalidateQueries({ queryKey: odontogramaKeys.byPaciente(data.pacienteId) });
    },
  });
}

export function useUpdateOdontograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OdontogramaUpdateInput }) =>
      odontogramaApi.update(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(odontogramaKeys.byAgendamento(data.agendamentoId), data);
      qc.invalidateQueries({ queryKey: odontogramaKeys.byPaciente(data.pacienteId) });
    },
  });
}
