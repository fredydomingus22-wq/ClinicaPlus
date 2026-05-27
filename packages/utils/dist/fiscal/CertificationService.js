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
exports.CertificationService = void 0;
const crypto = __importStar(require("crypto"));
const errors_1 = require("../errors");
/**
 * Serviço responsável por assinaturas digitais RSA-2048.
 * Gere duas identidades:
 * 1. Produtor (ClinicaPlus): Para jwsSoftwareSignature (fixa global).
 * 2. Contribuinte (Clínica): Para jwsDocumentSignature e jwsSignature (específica por tenant).
 */
class CertificationService {
    constructor(keys) {
        // Carrega a chave do produtor do ambiente por defeito
        const rawProducerKey = (keys?.producerPrivateKey || process.env.AGT_PRIVATE_KEY || '');
        this.producerPrivateKey = rawProducerKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim();
        // Chaves do tenant (passadas dinamicamente do banco de dados)
        const rawTenantPrivateKey = (keys?.tenantPrivateKey || '');
        this.tenantPrivateKey = rawTenantPrivateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim() || undefined;
        const rawTenantPublicKey = (keys?.tenantPublicKey || '');
        this.tenantPublicKey = rawTenantPublicKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim() || undefined;
    }
    validateKeySize(key, label) {
        try {
            const keyObj = crypto.createPrivateKey(key);
            const { modulusLength } = keyObj.asymmetricKeyDetails || {};
            if (modulusLength && modulusLength < 2048) {
                throw new errors_1.AppError(`A chave privada do ${label} deve ter no mínimo 2048 bits.`, 400);
            }
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            throw new errors_1.AppError(`Chave privada do ${label} inválida ou mal formatada.`, 400);
        }
    }
    ensureProducerKey() {
        if (!this.producerPrivateKey || this.producerPrivateKey.length < 32) {
            throw new errors_1.AppError('Chave privada do produtor não configurada ou inválida (AGT_PRIVATE_KEY)', 500);
        }
        // Validate RSA key size (>=2048 bits)
        this.validateKeySize(this.producerPrivateKey, 'produtor');
        return this.producerPrivateKey;
    }
    ensureTenantKey() {
        if (!this.tenantPrivateKey || this.tenantPrivateKey.length < 32) {
            if (process.env.AGT_MOCK === 'true') {
                // Em modo MOCK, se não houver chave do tenant, usamos a do produtor como fallback
                // para evitar erros 400 em desenvolvimento.
                return this.producerPrivateKey;
            }
            throw new errors_1.AppError('Chave privada da clínica (contribuinte) não configurada ou inválida para esta conta', 400);
        }
        // Validate RSA key size (>=2048 bits)
        this.validateKeySize(this.tenantPrivateKey, 'tenant');
        return this.tenantPrivateKey;
    }
    /**
     * Converte um objeto para JSON sem espaços e com chaves ordenadas (JSON Canónico)
     */
    canonicalStringify(obj) {
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map(item => this.canonicalStringify(item)).join(',') + ']';
        }
        const sortedKeys = Object.keys(obj).sort();
        const result = sortedKeys.map(key => {
            return `${JSON.stringify(key)}:${this.canonicalStringify(obj[key])}`;
        });
        return '{' + result.join(',') + '}';
    }
    /**
     * Assinatura JWS genérica com uma chave específica
     */
    signWithKey(payload, privateKey) {
        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };
        const jsonHeader = this.canonicalStringify(header);
        const jsonPayload = this.canonicalStringify(payload);
        const encodedHeader = Buffer.from(jsonHeader).toString('base64url');
        const encodedPayload = Buffer.from(jsonPayload).toString('base64url');
        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(`${encodedHeader}.${encodedPayload}`);
            sign.end();
            const signature = sign.sign(privateKey, 'base64url');
            return `${encodedHeader}.${encodedPayload}.${signature}`;
        }
        catch (error) {
            throw new errors_1.AppError(`Erro ao gerar assinatura JWS: ${error.message}`, 500);
        }
    }
    /**
     * jwsSoftwareSignature: Assina com a chave do PRODUTOR
     */
    signSoftwareJWS(data) {
        const key = this.ensureProducerKey();
        // Fonte de verdade (skill AGT): jwsSoftwareSignature assina APENAS:
        // { productId, productVersion, softwareValidationNumber }
        // (mesmo quando `softwareInfoDetail` inclui `signatureVersion` no registarFactura).
        const payload = {
            productId: data.productId,
            productVersion: data.productVersion,
            softwareValidationNumber: data.softwareValidationNumber,
        };
        return this.signWithKey(payload, key);
    }
    /**
     * jwsDocumentSignature: Assina com a chave do TENANT (Contribuinte)
     */
    signDocumentJWS(data) {
        const key = this.ensureTenantKey();
        return this.signWithKey(data, key);
    }
    /**
     * jwsSignature: Assina com a chave do TENANT (Contribuinte)
     */
    signRequestJWS(data) {
        const key = this.ensureTenantKey();
        return this.signWithKey(data, key);
    }
    /**
     * Assinatura legada para SAF-T e Hash Chain (faturas.fiscalHash)
     * Usa a chave do TENANT.
     */
    assinarDocumento(params) {
        const key = this.ensureTenantKey();
        const { dataEmissao, dataDocumento, numero, total, hashAnterior } = params;
        const formattedDateEmissao = dataEmissao.toISOString().split('T')[0];
        const formattedDataDoc = dataDocumento.toISOString().split('T')[0];
        const totalFinal = (total).toFixed(2);
        const payload = `${formattedDateEmissao};${formattedDataDoc};${numero};${totalFinal};${hashAnterior}`;
        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(payload);
            sign.end();
            const signature = sign.sign(key, 'base64');
            return {
                hash: signature,
                hashControl: '1'
            };
        }
        catch (error) {
            throw new errors_1.AppError(`Erro ao assinar documento fiscal: ${error.message}`, 500);
        }
    }
    /**
     * Verifica a validade de um hash (Usa chave pública do TENANT)
     */
    verificarAssinatura(params) {
        const publicKey = this.tenantPublicKey || process.env.AGT_PUBLIC_KEY;
        if (!publicKey)
            return false;
        const { dataEmissao, dataDocumento, numero, total, hashAnterior, signatureBase64 } = params;
        const formattedDateEmissao = dataEmissao.toISOString().split('T')[0];
        const formattedDataDoc = dataDocumento.toISOString().split('T')[0];
        const totalFinal = (total).toFixed(2);
        const payload = `${formattedDateEmissao};${formattedDataDoc};${numero};${totalFinal};${hashAnterior}`;
        try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(payload);
            verify.end();
            return verify.verify(publicKey, signatureBase64, 'base64');
        }
        catch (error) {
            return false;
        }
    }
}
exports.CertificationService = CertificationService;
//# sourceMappingURL=CertificationService.js.map