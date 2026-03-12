import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../api/client';
import type { 
  ExameDTO, 
  ExameCreateInput 
} from '@clinicaplus/types';

/**
 * Hook to manage medical exams.
 */
export function useExames(pacienteId?: string) {
  const queryClient = useQueryClient();

  const examesQuery = useQuery({
    queryKey: ['exames', pacienteId],
    queryFn: async () => {
      if (!pacienteId) return [];
      const response = await api.get<ExameDTO[]>(`/exames/paciente/${pacienteId}`);
      return response.data;
    },
    enabled: !!pacienteId,
  });

  const createExame = useMutation({
    mutationFn: async (data: ExameCreateInput) => {
      const response = await api.post<ExameDTO>('/exames', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exames', pacienteId] });
    },
  });

  return {
    exames: examesQuery.data || [],
    isLoading: examesQuery.isLoading,
    createExame,
  };
}
