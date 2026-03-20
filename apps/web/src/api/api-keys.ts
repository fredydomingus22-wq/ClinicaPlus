import { apiFetch } from '../lib/fetch-wrapper';
import { ApiKeyCreateInput, ApiKeyResponse, ApiKeyDTO } from '@clinicaplus/types';

export const apiKeysApi = {
  /**
   * Lista as API Keys da clínica.
   */
  getList: () => apiFetch<{ success: boolean; data: ApiKeyDTO[] }>('/api/api-keys')
    .then(res => res.data ?? []),

  /**
   * Cria uma nova API Key.
   */
  create: (data: ApiKeyCreateInput) => apiFetch<{ success: boolean; data: ApiKeyResponse }>('/api/api-keys', {
    method: 'POST',
    json: data
  }).then(res => res.data ?? null),

  /**
   * Revoga uma API Key.
   */
  revoke: (id: string) => apiFetch<{ success: boolean; message: string }>(`/api/api-keys/${id}`, {
    method: 'DELETE'
  })
};
