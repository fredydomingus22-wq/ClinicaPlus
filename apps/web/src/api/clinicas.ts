import { apiClient } from './client';
import type { 
  ClinicaDTO, 
  ClinicaUpdateInput,
  ContactoClinicaInput
} from '@clinicaplus/types';

export const clinicasApi = {
  getMe: () =>
    apiClient.get<{ data: ClinicaDTO }>('/clinicas/me')
      .then(r => r.data.data),

  updateMe: (data: ClinicaUpdateInput) =>
    apiClient.patch<{ data: ClinicaDTO }>('/clinicas/me', data)
      .then(r => r.data.data),

  updateContactos: (contactos: ContactoClinicaInput[]) =>
    apiClient.put<{ data: ClinicaDTO }>('/clinicas/me/contactos', contactos)
      .then(r => r.data.data),
};
