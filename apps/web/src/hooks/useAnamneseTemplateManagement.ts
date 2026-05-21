import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { anamneseTemplateApi } from '../api/anamneseTemplate';

export type TemplateQuestao = {
  id: string;
  pergunta: string;
  tipo: string;
  opcoes?: string[];
  obrigatorio?: boolean;
  secao?: string;
};

export type TemplateItem = {
  id: string;
  especialidadeId: string;
  titulo: string;
  questoes: TemplateQuestao[];
  ativo?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

export const anamneseTemplateKeys = {
  all: () => ['anamnese-templates'] as const,
  byEspecialidade: (especialidadeId: string) => [...anamneseTemplateKeys.all(), especialidadeId] as const,
};

export function useAnamneseTemplateManagement(especialidadeId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: anamneseTemplateKeys.byEspecialidade(especialidadeId || ''),
    queryFn: async () => {
      const data = await anamneseTemplateApi.getByEspecialidade(especialidadeId as string);
      if (Array.isArray(data)) return data as TemplateItem[];
      return data ? [data as TemplateItem] : [];
    },
    enabled: Boolean(especialidadeId),
  });

  const createTemplate = useMutation({
    mutationFn: (payload: { especialidadeId: string; titulo: string; questoes: TemplateQuestao[] }) =>
      anamneseTemplateApi.create(payload),
    onSuccess: () => {
      if (especialidadeId) {
        queryClient.invalidateQueries({ queryKey: anamneseTemplateKeys.byEspecialidade(especialidadeId) });
      }
    },
  });

  const updateTemplate = useMutation({
    mutationFn: (payload: { templateId: string; titulo?: string; questoes?: TemplateQuestao[] }) => {
      const updatePayload: { titulo?: string; questoes?: TemplateQuestao[] } = {};
      if (payload.titulo !== undefined) updatePayload.titulo = payload.titulo;
      if (payload.questoes !== undefined) updatePayload.questoes = payload.questoes;
      return anamneseTemplateApi.update(payload.templateId, updatePayload);
    },
    onSuccess: () => {
      if (especialidadeId) {
        queryClient.invalidateQueries({ queryKey: anamneseTemplateKeys.byEspecialidade(especialidadeId) });
      }
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (templateId: string) => anamneseTemplateApi.delete(templateId),
    onSuccess: () => {
      if (especialidadeId) {
        queryClient.invalidateQueries({ queryKey: anamneseTemplateKeys.byEspecialidade(especialidadeId) });
      }
    },
  });

  return { ...query, createTemplate, updateTemplate, deleteTemplate };
}
