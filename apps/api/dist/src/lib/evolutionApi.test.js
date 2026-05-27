"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 1. Mock do config ANTES de importar o evolutionApi
vitest_1.vi.mock('./config', () => ({
    config: {
        EVOLUTION_API_URL: 'https://evo-test.ao',
        EVOLUTION_API_KEY: 'test-key',
    }
}));
const vitest_1 = require("vitest");
const axios_1 = __importDefault(require("axios"));
// 2. Mock do axios com suporte para .create() no topo do ficheiro
vitest_1.vi.mock('axios', () => {
    const mAxios = {
        create: vitest_1.vi.fn(),
        post: vitest_1.vi.fn(),
        get: vitest_1.vi.fn(),
        delete: vitest_1.vi.fn(),
        defaults: { headers: { common: {} } },
    };
    mAxios.create.mockReturnValue(mAxios);
    return {
        default: mAxios,
        ...mAxios
    };
});
const mockedAxios = axios_1.default;
const evolutionApi_1 = require("./evolutionApi");
(0, vitest_1.describe)('evolutionApi', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('criarInstancia', () => {
        (0, vitest_1.it)('deve fazer POST /instance/create com parâmetros correctos', async () => {
            const mockResponse = {
                instance: { instanceName: 'cp-test', status: 'created' }
            };
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });
            const result = await evolutionApi_1.evolutionApi.criarInstancia('cp-test', 'https://webhook.test');
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenCalledWith('/instance/create', {
                instanceName: 'cp-test',
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                webhook: {
                    url: 'https://webhook.test',
                    byEvents: false,
                    base64: false,
                    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
                },
            });
            // Na spec atual, o retorno é o objeto 'data' completo
            (0, vitest_1.expect)(result).toEqual(mockResponse);
        });
        (0, vitest_1.it)('deve lançar erro se Evolution API retornar 4xx', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                response: { status: 400, data: { message: 'Invalid name' } }
            });
            await (0, vitest_1.expect)(evolutionApi_1.evolutionApi.criarInstancia('invalid', 'url')).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('enviarTexto', () => {
        (0, vitest_1.it)('deve fazer POST /message/sendText/{instanceName}', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { key: { id: 'msg-1' } } });
            await evolutionApi_1.evolutionApi.enviarTexto('cp-test', '244900000000', 'Olá');
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenCalledWith('/message/sendText/cp-test', vitest_1.expect.objectContaining({
                number: '244900000000',
                text: 'Olá'
            }));
        });
        (0, vitest_1.it)('deve incluir delay de 1200ms', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { key: { id: 'msg-1' } } });
            await evolutionApi_1.evolutionApi.enviarTexto('cp-test', '244900000000', 'Olá');
            (0, vitest_1.expect)(mockedAxios.post).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.objectContaining({
                delay: 1200
            }));
        });
    });
    (0, vitest_1.describe)('estadoConexao', () => {
        (0, vitest_1.it)('deve retornar estado "open" when connected', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { instance: { state: 'open' } } });
            const result = await evolutionApi_1.evolutionApi.estadoConexao('cp-test');
            (0, vitest_1.expect)(mockedAxios.get).toHaveBeenCalledWith('/instance/connectionState/cp-test');
            (0, vitest_1.expect)(result.instance.state).toBe('open');
        });
    });
});
