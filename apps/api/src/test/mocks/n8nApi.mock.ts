import { vi } from 'vitest';

export const mockN8nApi = {
  criarWorkflow:  vi.fn().mockResolvedValue({
    workflowId: 'wf-test-1',
    webhookPath: 'wa-marcacao-cp-test',
  }),
  activar:        vi.fn().mockResolvedValue(undefined),
  desactivar:     vi.fn().mockResolvedValue(undefined),
  eliminar:       vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../lib/n8nApi', () => ({ n8nApi: mockN8nApi }));
