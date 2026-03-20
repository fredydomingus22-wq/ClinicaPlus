import { apiFetch } from '../lib/fetch-wrapper';
import { WebhookCreateInput, WebhookUpdateInput, WebhookDTO, WebhookEntregaDTO } from '@clinicaplus/types';

export const webhooksApi = {
  /**
   * Lista os webhooks da clínica.
   */
  getList: () => apiFetch<{ success: boolean; data: WebhookDTO[] }>('/api/webhooks')
    .then(res => res.data ?? []),

  /**
   * Cria um novo webhook.
   */
  create: (data: WebhookCreateInput) => apiFetch<{ success: boolean; data: WebhookDTO }>('/api/webhooks', {
    method: 'POST',
    json: data
  }).then(res => res.data ?? null),

  /**
   * Atualiza um webhook.
   */
  update: (id: string, data: WebhookUpdateInput) => apiFetch<{ success: boolean; data: WebhookDTO }>(`/api/webhooks/${id}`, {
    method: 'PATCH',
    json: data
  }).then(res => res.data ?? null),

  /**
   * Remove um webhook.
   */
  delete: (id: string) => apiFetch<{ success: boolean; message: string }>(`/api/webhooks/${id}`, {
    method: 'DELETE'
  }),

  /**
   * Testa um webhook enviando um evento fictício.
   */
  test: (id: string) => apiFetch<{ success: boolean; message: string }>(`/api/webhooks/${id}/testar`, {
    method: 'POST'
  }),

  /**
   * Lista histórico de entregas de um webhook.
   */
  getEntregas: (id: string) => apiFetch<{ success: boolean; data: WebhookEntregaDTO[] }>(`/api/webhooks/${id}/entregas`)
    .then(res => res.data ?? []),

  /**
   * Reenvia uma entrega específica.
   */
  reenviar: (webhookId: string, entregaId: string) => apiFetch<{ success: boolean; message: string }>(`/api/webhooks/${webhookId}/entregas/${entregaId}/reenviar`, {
    method: 'POST'
  })
};
