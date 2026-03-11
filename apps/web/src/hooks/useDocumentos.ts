import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { 
  DocumentoDTO, 
  DocumentoCreateInput 
} from '@clinicaplus/types';

/**
 * Hook to manage medical documents (PDF references).
 */
export function useDocumentos(pacienteId?: string) {
  const queryClient = useQueryClient();

  const documentosQuery = useQuery({
    queryKey: ['documentos', pacienteId],
    queryFn: async () => {
      if (!pacienteId) return [];
      const response = await api.get<DocumentoDTO[]>(`/documentos/paciente/${pacienteId}`);
      return response.data;
    },
    enabled: !!pacienteId,
  });

  const createDocumento = useMutation({
    mutationFn: async (data: DocumentoCreateInput) => {
      const response = await api.post<DocumentoDTO>('/documentos', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', pacienteId] });
    },
  });

  return {
    documentos: documentosQuery.data || [],
    isLoading: documentosQuery.isLoading,
    createDocumento,
  };
}
