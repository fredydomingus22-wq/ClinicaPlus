import { apiClient } from './client';

export const anamneseTemplateApi = {
  getByEspecialidade: async (especialidadeId: string) => {
    const { data } = await apiClient.get(`/anamneseTemplates/especialidade/${especialidadeId}`);
    return data;
  },
  create: async (payload: { especialidadeId: string; titulo: string; questoes: unknown[] }) => {
    const { data } = await apiClient.post('/anamneseTemplates', payload);
    return data;
  },
  update: async (templateId: string, payload: { titulo?: string; questoes?: unknown[] }) => {
    const { data } = await apiClient.patch(`/anamneseTemplates/${templateId}`, payload);
    return data;
  },
  delete: async (templateId: string) => {
    await apiClient.delete(`/anamneseTemplates/${templateId}`);
  },
};
