import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { anamneseApi } from '../api/anamnese';
import type { Especialidade, AnamneseCreateInput, AnamneseUpdateInput } from '@clinicaplus/types';

export const anamneseKeys = {
  all: () => ['anamneses'] as const,
  template: (esp: Especialidade) => [...anamneseKeys.all(), 'template', esp] as const,
  byAgendamento: (id: string) => [...anamneseKeys.all(), 'agendamento', id] as const,
  byPaciente: (id: string) => [...anamneseKeys.all(), 'paciente', id] as const,
};

export function useAnamneseTemplate(especialidade: Especialidade) {
  return useQuery({
    queryKey: anamneseKeys.template(especialidade),
    queryFn: () => anamneseApi.getTemplate(especialidade),
    staleTime: 1000 * 60 * 60, // 1h (templates don't change often)
  });
}

export function useAnamneseByAgendamento(agendamentoId: string) {
  return useQuery({
    queryKey: anamneseKeys.byAgendamento(agendamentoId),
    queryFn: () => anamneseApi.getByAgendamento(agendamentoId),
    enabled: !!agendamentoId,
  });
}

export function useCreateAnamnese() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnamneseCreateInput) => anamneseApi.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: anamneseKeys.byAgendamento(data.agendamentoId!) });
      qc.invalidateQueries({ queryKey: anamneseKeys.byPaciente(data.pacienteId) });
    },
  });
}

export function useUpdateAnamnese() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnamneseUpdateInput }) => 
      anamneseApi.update(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(anamneseKeys.byAgendamento(data.agendamentoId!), data);
    },
  });
}
