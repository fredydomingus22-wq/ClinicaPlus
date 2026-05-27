"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Script para gerar pares de chaves RSA 2048 bits para assinatura da AGT
 */
async function generateKeys() {
    console.log('--- Iniciando Geração de Chaves RSA 2048 bits ---');
    const { privateKey, publicKey } = crypto_1.default.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
    const envPath = path_1.default.join(process.cwd(), '.env');
    const privateKeyEscaped = privateKey.replace(/\n/g, '\\n');
    const publicKeyEscaped = publicKey.replace(/\n/g, '\\n');
    console.log('\n--- Chave Pública (Carregar no Portal AGT) ---');
    console.log(publicKey);
    console.log('--- Adicionando às variáveis de ambiente (.env) ---');
    const envContent = `\n# AGT Fiscal Keys\nAGT_PRIVATE_KEY="${privateKeyEscaped}"\nAGT_PUBLIC_KEY="${publicKeyEscaped}"\n`;
    fs_1.default.appendFileSync(envPath, envContent);
    console.log('Sucesso! Chaves geradas e guardadas no .env');
}
generateKeys().catch(console.error);
