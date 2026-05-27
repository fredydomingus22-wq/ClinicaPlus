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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CertificationService_1 = require("../CertificationService");
const crypto = __importStar(require("crypto"));
(0, vitest_1.describe)('CertificationService (Unit)', () => {
    let service;
    let privateKey;
    let publicKey;
    (0, vitest_1.beforeAll)(() => {
        const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        privateKey = priv;
        publicKey = pub;
        service = new CertificationService_1.CertificationService({ privateKey, publicKey });
    });
    (0, vitest_1.it)('deve assinar um documento e gerar um hash válido', () => {
        const params = {
            dataEmissao: new Date('2026-05-17'),
            dataDocumento: new Date('2026-05-17T15:00:00Z'),
            numero: 'FT CPLS/1',
            total: 15000.50,
            hashAnterior: ''
        };
        const { hash, hashControl } = service.assinarDocumento(params);
        (0, vitest_1.expect)(hash).toBeDefined();
        (0, vitest_1.expect)(hash.length).toBeGreaterThan(100);
        (0, vitest_1.expect)(hashControl).toBe('1');
        // Verificar se a assinatura bate com o payload esperado
        const valido = service.verificarAssinatura({
            ...params,
            signatureBase64: hash
        });
        (0, vitest_1.expect)(valido).toBe(true);
    });
    (0, vitest_1.it)('deve falhar na verificação se os dados do documento forem alterados', () => {
        const params = {
            dataEmissao: new Date('2026-05-17'),
            dataDocumento: new Date('2026-05-17'),
            numero: 'FT CPLS/1',
            total: 1000,
            hashAnterior: ''
        };
        const { hash } = service.assinarDocumento(params);
        // Alterar o total
        const invalido = service.verificarAssinatura({
            ...params,
            total: 1001,
            signatureBase64: hash
        });
        (0, vitest_1.expect)(invalido).toBe(false);
    });
    (0, vitest_1.it)('deve gerar assinatura JWS válida', () => {
        const payload = { test: true };
        const jws = service.signJWS(payload);
        (0, vitest_1.expect)(jws).toContain('.');
        const [header, data, signature] = jws.split('.');
        (0, vitest_1.expect)(header).toBeDefined();
        (0, vitest_1.expect)(data).toBeDefined();
        (0, vitest_1.expect)(signature).toBeDefined();
    });
});
//# sourceMappingURL=CertificationService.test.js.map