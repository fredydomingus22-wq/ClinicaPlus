"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const verificarHmacEvolution_1 = require("./verificarHmacEvolution");
const crypto_1 = __importDefault(require("crypto"));
(0, vitest_1.describe)('verificarHmacEvolution middleware', () => {
    let mockReq;
    let mockRes;
    const nextFunction = vitest_1.vi.fn();
    const secret = 'test-secret';
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        process.env.DISABLE_WEBHOOK_SIGNATURE_CHECK = 'false';
        process.env.EVOLUTION_WEBHOOK_SECRET = secret;
        mockReq = {
            headers: {},
            body: { event: 'test.event' }
        };
        mockRes = {
            status: vitest_1.vi.fn().mockReturnThis(),
            json: vitest_1.vi.fn().mockReturnThis()
        };
    });
    (0, vitest_1.it)('deve rejeitar payload sem assinatura HMAC', async () => {
        await (0, verificarHmacEvolution_1.verificarHmacEvolution)(mockReq, mockRes, nextFunction);
        (0, vitest_1.expect)(nextFunction).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            statusCode: 401,
            code: 'WEBHOOK_NO_SIGNATURE'
        }));
    });
    (0, vitest_1.it)('deve rejeitar payload com assinatura HMAC inválida', async () => {
        mockReq.headers['x-evolution-signature'] = 'invalid-hmac';
        await (0, verificarHmacEvolution_1.verificarHmacEvolution)(mockReq, mockRes, nextFunction);
        (0, vitest_1.expect)(nextFunction).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            statusCode: 401
        }));
    });
    (0, vitest_1.it)('deve aceitar payload com assinatura HMAC válida', async () => {
        const payload = JSON.stringify(mockReq.body);
        const validHmac = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
        mockReq.headers['x-evolution-signature'] = validHmac;
        await (0, verificarHmacEvolution_1.verificarHmacEvolution)(mockReq, mockRes, nextFunction);
        (0, vitest_1.expect)(nextFunction).toHaveBeenCalled();
        (0, vitest_1.expect)(mockRes.status).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('deve permitir acesso se EVOLUTION_WEBHOOK_SECRET não estiver definido fora de produção', async () => {
        delete process.env.EVOLUTION_WEBHOOK_SECRET;
        await (0, verificarHmacEvolution_1.verificarHmacEvolution)(mockReq, mockRes, nextFunction);
        (0, vitest_1.expect)(nextFunction).toHaveBeenCalled();
    });
});
