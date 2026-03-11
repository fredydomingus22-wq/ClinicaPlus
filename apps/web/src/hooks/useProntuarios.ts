import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { 
  ProntuarioDTO, 
  ProntuarioCreateInput,
} from '@clinicaplus/types';

/**
 * Hook to manage medical records (Prontuários).
 */
export function useProntuarios(pacienteId?: string) {
  const queryClient = useQueryClient();

  const prontuariosQuery = useQuery({
    queryKey: ['prontuarios', pacienteId],
    queryFn: async () => {
      if (!pacienteId) return [];
      const response = await api.get<ProntuarioDTO[]>(`/prontuarios/paciente/${pacienteId}`);
      return response.data;
    },
    enabled: !!pacienteId,
  });

  const createProntuario = useMutation({
    mutationFn: async (data: ProntuarioCreateInput) => {
      const response = await api.post<ProntuarioDTO>('/prontuarios', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prontuarios', pacienteId] });
    },
  });

  return {
    prontuarios: prontuariosQuery.data || [],
    isLoading: prontuariosQuery.isLoading,
    createProntuario,
  };
}
