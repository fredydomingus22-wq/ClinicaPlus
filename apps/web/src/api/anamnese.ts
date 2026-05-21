import { apiClient as api } from './client';
import type { 
  AnamneseDTO, 
  AnamneseCreateInput, 
  AnamneseUpdateInput,
  AnamneseQuestao,
  Especialidade
} from '@clinicaplus/types';

export const anamneseApi = {
  getTemplate: async (especialidade: Especialidade): Promise<AnamneseQuestao[]> => {
    const { data } = await api.get(`/anamneses/templates/${especialidade}`);
    return data;
  },

  getByAgendamento: async (agendamentoId: string): Promise<AnamneseDTO | null> => {
    const { data } = await api.get(`/anamneses/agendamento/${agendamentoId}`);
    return data;
  },

  getByPaciente: async (pacienteId: string): Promise<AnamneseDTO[]> => {
    const { data } = await api.get(`/anamneses/paciente/${pacienteId}`);
    return data;
  },

  create: async (payload: AnamneseCreateInput): Promise<AnamneseDTO> => {
    const { data } = await api.post('/anamneses', payload);
    return data;
  },

  update: async (id: string, payload: AnamneseUpdateInput): Promise<AnamneseDTO> => {
    const { data } = await api.patch(`/anamneses/${id}`, payload);
    return data;
  }
};
