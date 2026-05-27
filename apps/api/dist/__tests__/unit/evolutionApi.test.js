"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const evoInstance = {
    interceptors: { response: { use: vitest_1.vi.fn() } },
    post: vitest_1.vi.fn(),
    get: vitest_1.vi.fn(),
    delete: vitest_1.vi.fn(),
};
vitest_1.vi.mock('axios', () => ({
    default: {
        create: vitest_1.vi.fn(() => evoInstance),
    },
}));
const evolutionApi_1 = require("../../lib/evolutionApi");
(0, vitest_1.describe)('EvolutionApi', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('criarInstancia', () => {
        (0, vitest_1.it)('deve chamar o endpoint correcto para criar uma instância', async () => {
            evoInstance.post.mockResolvedValueOnce({
                data: { hash: 'abc', instance: { instanceName: 'inst-1', status: 'created' } }
            });
            const result = await evolutionApi_1.evolutionApi.criarInstancia('inst-1', 'http://webhook.test');
            (0, vitest_1.expect)(evoInstance.post).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/instance/create'), vitest_1.expect.objectContaining({
                instanceName: 'inst-1',
                webhook: vitest_1.expect.objectContaining({ url: 'http://webhook.test' })
            }));
            (0, vitest_1.expect)(result).toMatchObject({ instance: { instanceName: 'inst-1' } });
        });
    });
    (0, vitest_1.describe)('obterQrCode', () => {
        (0, vitest_1.it)('deve retornar o base64 do QR code', async () => {
            evoInstance.get.mockResolvedValueOnce({
                data: { base64: 'data:image/png;base64,...' }
            });
            const result = await evolutionApi_1.evolutionApi.obterQrCode('inst-1');
            (0, vitest_1.expect)(result).toEqual({ base64: 'data:image/png;base64,...' });
            (0, vitest_1.expect)(evoInstance.get).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/instance/connect/inst-1'));
        });
    });
    (0, vitest_1.describe)('enviarTexto', () => {
        (0, vitest_1.it)('deve enviar mensagem de texto para o número especificado', async () => {
            evoInstance.post.mockResolvedValueOnce({
                data: { key: { id: 'msg-1', remoteJid: '244923456789@s.whatsapp.net', fromMe: true }, status: 'PENDING', messageTimestamp: 123 }
            });
            const result = await evolutionApi_1.evolutionApi.enviarTexto('inst-1', '244923456789', 'Olá mundo');
            (0, vitest_1.expect)(evoInstance.post).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/message/sendText/inst-1'), vitest_1.expect.objectContaining({
                number: '244923456789',
                text: 'Olá mundo'
            }));
            (0, vitest_1.expect)(result.key.id).toBe('msg-1');
        });
    });
});
