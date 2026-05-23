import { apiClient as api } from './client';
import type {
  OdontogramaDTO,
  OdontogramaCreateInput,
  OdontogramaUpdateInput,
} from '@clinicaplus/types';

export const odontogramaApi = {
  getByAgendamento: async (agendamentoId: string): Promise<OdontogramaDTO | null> => {
    const { data } = await api.get(`/odontogramas/agendamento/${agendamentoId}`);
    return data;
  },

  getByPaciente: async (pacienteId: string): Promise<OdontogramaDTO[]> => {
    const { data } = await api.get(`/odontogramas/paciente/${pacienteId}`);
    return data;
  },

  create: async (payload: OdontogramaCreateInput): Promise<OdontogramaDTO> => {
    const { data } = await api.post('/odontogramas', payload);
    return data;
  },

  update: async (id: string, payload: OdontogramaUpdateInput): Promise<OdontogramaDTO> => {
    const { data } = await api.patch(`/odontogramas/${id}`, payload);
    return data;
  },
};
