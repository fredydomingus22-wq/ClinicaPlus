"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockN8nApi = void 0;
/**
 * Mock central para a n8n API.
 * Importar este ficheiro nos tests de wa-automacao.service para simular workflows.
 */
const vitest_1 = require("vitest");
exports.mockN8nApi = {
    criarWorkflow: vitest_1.vi.fn().mockResolvedValue({
        workflowId: 'wf-test-1',
        webhookPath: 'wa-marcacao-cp-test',
    }),
    activar: vitest_1.vi.fn().mockResolvedValue(undefined),
    desactivar: vitest_1.vi.fn().mockResolvedValue(undefined),
    eliminar: vitest_1.vi.fn().mockResolvedValue(undefined),
};
vitest_1.vi.mock('../../lib/n8nApi', () => ({ n8nApi: exports.mockN8nApi }));
