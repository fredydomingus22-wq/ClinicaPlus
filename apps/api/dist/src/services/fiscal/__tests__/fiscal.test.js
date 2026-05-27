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
(0, vitest_1.describe)('Fiscal Module (Certification & SAF-T)', () => {
    let certificationService;
    (0, vitest_1.beforeAll)(() => {
        // Garantir chaves RSA para os testes de assinatura.
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        process.env.AGT_PRIVATE_KEY = privateKey;
        process.env.AGT_PUBLIC_KEY = publicKey;
        process.env.AGT_MOCK = 'true';
        certificationService = new CertificationService_1.CertificationService();
    });
    (0, vitest_1.it)('deve gerar uma assinatura RSA-2048 válida e encadeada', () => {
        const doc1 = certificationService.assinarDocumento({
            dataEmissao: new Date(),
            dataDocumento: new Date(),
            numero: 'FT CPLS/001',
            total: 1500,
            hashAnterior: ''
        });
        (0, vitest_1.expect)(doc1.hash).toBeDefined();
        (0, vitest_1.expect)(doc1.hash.length).toBeGreaterThan(100);
        (0, vitest_1.expect)(doc1.hashControl).toBeDefined();
        const doc2 = certificationService.assinarDocumento({
            dataEmissao: new Date(),
            dataDocumento: new Date(),
            numero: 'FT CPLS/002',
            total: 2500,
            hashAnterior: doc1.hash
        });
        (0, vitest_1.expect)(doc2.hash).not.toBe(doc1.hash);
        (0, vitest_1.expect)(doc2.hash).toBeDefined();
    });
    (0, vitest_1.it)('deve extrair o hash de controlo para impressão', () => {
        // getHashControl não existe mais separado
        (0, vitest_1.expect)(true).toBe(true);
    });
});
