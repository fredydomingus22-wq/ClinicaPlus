/**
 * Mock central para a Evolution API.
 * Importar este ficheiro nos tests de services WA para simular chamadas HTTP.
 *
 * Uso: import './mocks/evolutionApi.mock' no inicio do ficheiro de teste,
 * ou usar vi.mock('../../lib/evolutionApi', ...) inline.
 */
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
