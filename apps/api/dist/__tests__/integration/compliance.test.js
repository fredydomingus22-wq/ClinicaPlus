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
const server_1 = require("../../server");
const factories_1 = require("../helpers/factories");
const CertificationService_1 = require("../../services/fiscal/CertificationService");
const crypto = __importStar(require("crypto"));
(0, vitest_1.describe)('Fiscal Compliance & Integration', () => {
    let ctx;
    let privateKey;
    let publicKey;
    let certService;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Gerar par de chaves RSA-2048 para o teste
        const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        privateKey = priv;
        publicKey = pub;
        // Configurar variáveis de ambiente para o serviço de certificação
        process.env.AGT_PRIVATE_KEY = privateKey;
        process.env.AGT_PUBLIC_KEY = publicKey;
        ctx = await factories_1.factories.setupClinicaCompleta();
        certService = new CertificationService_1.CertificationService({
            tenantPublicKey: publicKey,
        });
    });
    (0, vitest_1.afterAll)(async () => {
        if (ctx) {
            await factories_1.factories.cleanupClinica(ctx.clinica.id);
        }
    });
    const faturas = [];
    (0, vitest_1.it)('1. Deve emitir uma sequência de 3 faturas e garantir a Hash Chain', async () => {
        for (let i = 1; i <= 3; i++) {
            // Criar rascunho
            const draft = await (0, supertest_1.default)(server_1.app)
                .post('/api/faturas')
                .set('Authorization', `Bearer ${ctx.adminToken}`)
                .send({
                pacienteId: ctx.paciente.id,
                tipo: 'PARTICULAR',
                itens: [{ descricao: `Serviço ${i}`, quantidade: 1, precoUnit: 1000 * i, taxaIva: 14 }],
            });
            const faturaId = draft.body.data.id;
            // Emitir
            const emit = await (0, supertest_1.default)(server_1.app)
                .patch(`/api/faturas/${faturaId}/emitir`)
                .set('Authorization', `Bearer ${ctx.adminToken}`);
            (0, vitest_1.expect)(emit.status).toBe(200);
            faturas.push(emit.body.data);
        }
        // Validar Cadeia
        // Fatura 2 deve ter hashAnterior = hash da Fatura 1
        (0, vitest_1.expect)(faturas[1].hashAnterior).toBe(faturas[0].fiscalHash);
        // Fatura 3 deve ter hashAnterior = hash da Fatura 2
        (0, vitest_1.expect)(faturas[2].hashAnterior).toBe(faturas[1].fiscalHash);
    });
    (0, vitest_1.it)('2. Deve validar a assinatura digital RSA-2048 de uma fatura', async () => {
        const fatura = faturas[0];
        const payload = {
            dataEmissao: new Date(fatura.dataEmissao),
            dataDocumento: new Date(fatura.criadoEm),
            numero: fatura.numeroFatura,
            total: fatura.total,
            hashAnterior: fatura.hashAnterior || '',
            signatureBase64: fatura.fiscalHash
        };
        const isValido = certService.verificarAssinatura(payload);
        (0, vitest_1.expect)(isValido).toBe(true);
    });
    (0, vitest_1.it)('3. Deve passar na auditoria de hash chain via API', async () => {
        const res = await (0, supertest_1.default)(server_1.app)
            .get('/api/fiscal/audit/hash-chain')
            .set('Authorization', `Bearer ${ctx.adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.valida).toBe(true);
        (0, vitest_1.expect)(res.body.totalDocumentos).toBeGreaterThanOrEqual(3);
    });
    (0, vitest_1.it)('4. Deve testar a conexão com a AGT (Mock Mode)', async () => {
        process.env.AGT_MOCK = 'true';
        const res = await (0, supertest_1.default)(server_1.app)
            .post('/api/fiscal/testar-conexao')
            .set('Authorization', `Bearer ${ctx.adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.sucesso).toBe(true);
        (0, vitest_1.expect)(res.body.mensagem).toContain('sucesso');
    });
    (0, vitest_1.it)('5. Deve exportar SAF-T AO e conter estrutura básica v1.01_01', async () => {
        const res = await (0, supertest_1.default)(server_1.app)
            .get(`/api/fiscal/saft?inicio=2024-01-01&fim=2026-12-31`)
            .set('Authorization', `Bearer ${ctx.adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.header['content-type']).toContain('xml');
        const xml = res.text;
        (0, vitest_1.expect)(xml).toContain('AuditFileSchemaVersion');
        (0, vitest_1.expect)(xml).toContain('1.01_01');
        (0, vitest_1.expect)(xml).toContain('TaxRegistrationNumber');
        (0, vitest_1.expect)(xml).toContain('<Invoice>');
    });
});
