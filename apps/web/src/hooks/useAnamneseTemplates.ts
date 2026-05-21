import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { AnamneseTemplate, AnamneseQuestao } from '../../types/anamnese';

/**
 * Hook to fetch, create, update and delete Anamnese Templates.
 * The hook is generic; it can fetch by specialtyId and is used by both
 * ADMIN and MEDICO UIs. ADMIN can invoke mutations; MEDICO will only use
 * the query part.
 */
export function useAnamneseTemplates(especialidadeId: string) {
  const queryClient = useQueryClient();

  const fetchTemplates = async (): Promise<AnamneseTemplate[]> => {
    const { data } = await axios.get<AnamneseTemplate[]>(
      `/api/anamneseTemplates/especialidade/${especialidadeId}`
    );
    return data;
  };

  const { data: templates, isLoading, error } = useQuery(['anamneseTemplates', especialidadeId], fetchTemplates);

  const createTemplate = useMutation(
    async (newTemplate: { titulo: string; questoes: AnamneseQuestao[] }) => {
      const payload = { especialidadeId, ...newTemplate };
      const { data } = await axios.post('/api/anamneseTemplates', payload);
      return data as AnamneseTemplate;
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['anamneseTemplates', especialidadeId]),
    }
  );

  const updateTemplate = useMutation(
    async (update: { templateId: string; titulo?: string; questoes?: AnamneseQuestao[] }) => {
      const { templateId, ...rest } = update;
      const { data } = await axios.patch(`/api/anamneseTemplates/${templateId}`, rest);
      return data as AnamneseTemplate;
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['anamneseTemplates', especialidadeId]),
    }
  );

  const deleteTemplate = useMutation(
    async (templateId: string) => {
      await axios.delete(`/api/anamneseTemplates/${templateId}`);
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['anamneseTemplates', especialidadeId]),
    }
  );

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
