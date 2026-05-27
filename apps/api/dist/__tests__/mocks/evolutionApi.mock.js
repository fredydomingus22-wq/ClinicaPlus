"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockEvolutionApi = void 0;
/**
 * Mock central para a Evolution API.
 * Importar este ficheiro nos tests de services WA para simular chamadas HTTP.
 *
 * Uso: import './mocks/evolutionApi.mock' no inicio do ficheiro de teste,
 * ou usar vi.mock('../../lib/evolutionApi', ...) inline.
 */
const vitest_1 = require("vitest");
exports.mockEvolutionApi = {
    criarInstancia: vitest_1.vi.fn().mockResolvedValue({ instanceName: 'cp-test', status: 'created' }),
    obterQrCode: vitest_1.vi.fn().mockResolvedValue({ base64: 'data:image/png;base64,iVBOR...' }),
    estadoConexao: vitest_1.vi.fn().mockResolvedValue({ state: 'open' }),
    enviarTexto: vitest_1.vi.fn().mockResolvedValue({ key: { id: 'msg-test-1' }, status: 'PENDING' }),
    desligar: vitest_1.vi.fn().mockResolvedValue(undefined),
    eliminar: vitest_1.vi.fn().mockResolvedValue(undefined),
};
vitest_1.vi.mock('../../lib/evolutionApi', () => ({ evolutionApi: exports.mockEvolutionApi }));
