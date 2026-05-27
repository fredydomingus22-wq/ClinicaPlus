"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const crypto = __importStar(require("crypto"));
const server_1 = require("../../server");
const factories_1 = require("../helpers/factories");
const AgtApiClient_1 = require("../../services/fiscal/AgtApiClient");
(0, vitest_1.describe)('Fiscal Series - solicitarSerie payload compliance', () => {
    let ctx;
    function decodeJwsPayload(jws) {
        const payload = jws.split('.')[1];
        if (!payload)
            throw new Error('JWS payload ausente');
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    }
    (0, vitest_1.beforeAll)(async () => {
        const { privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        process.env.AGT_PRIVATE_KEY = privateKey;
        process.env.AGT_MOCK = 'true';
        process.env.AGT_SOFTWARE_CERTIFICATE = process.env.AGT_SOFTWARE_CERTIFICATE || 'C_134';
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        await factories_1.factories.cleanupClinica(ctx.clinica.id);
    });
    (0, vitest_1.it)('deve enviar establishmentNumber no payload para a AGT', async () => {
        const solicitarSerieSpy = vitest_1.vi.spyOn(AgtApiClient_1.agtApiClient, 'solicitarSerie').mockResolvedValue({
            resultCode: 1,
            seriesFEResult: {
                seriesCode: 'LD6325S2042N',
                authorizedQuantity: '999999999999',
                firstDocumentNo: '1',
                lastDocumentNo: '999999999999',
            },
        });
        const establishmentNumber = '10';
        const res = await (0, supertest_1.default)(server_1.app)
            .post('/api/fiscal/series/solicitar')
            .set('Authorization', `Bearer ${ctx.adminToken}`)
            .send({
            documentType: 'LD',
            establishmentNumber,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(solicitarSerieSpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(solicitarSerieSpy.mock.calls[0]?.[0]).toMatchObject({
            documentType: 'LD',
            establishmentNumber: '10',
            seriesContingencyIndicator: 'N',
            schemaVersion: '1.2',
        });
        (0, vitest_1.expect)(solicitarSerieSpy.mock.calls[0]?.[0]?.jwsSignature).toBeTypeOf('string');
        (0, vitest_1.expect)(decodeJwsPayload(solicitarSerieSpy.mock.calls[0][0].jwsSignature)).toMatchObject({
            taxRegistrationNumber: ctx.clinica.nif,
            establishmentNumber: '10',
            seriesYear: new Date().getFullYear().toString(),
            documentType: 'LD',
            seriesContingencyIndicator: 'N',
        });
        solicitarSerieSpy.mockRestore();
    });
});
