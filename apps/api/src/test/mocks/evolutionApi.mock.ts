import { vi } from 'vitest';

export const mockEvolutionApi = {
  criarInstancia:  vi.fn().mockResolvedValue({ instanceName: 'cp-test', status: 'created' }),
  obterQrCode:     vi.fn().mockResolvedValue({ base64: 'data:image/png;base64,iVBOR...' }),
  estadoConexao:   vi.fn().mockResolvedValue({ state: 'open' }),
  enviarTexto:     vi.fn().mockResolvedValue({ key: { id: 'msg-test-1' }, status: 'PENDING' }),
  desligar:        vi.fn().mockResolvedValue(undefined),
  eliminar:        vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../lib/evolutionApi', () => ({ evolutionApi: mockEvolutionApi }));
