/* eslint-disable no-console */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Script para gerar pares de chaves RSA 2048 bits para assinatura da AGT
 */
async function generateKeys(): Promise<void> {
  console.log('--- Iniciando Geração de Chaves RSA 2048 bits ---');

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
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

  const envPath = path.join(process.cwd(), '.env');
  const privateKeyEscaped = privateKey.replace(/\n/g, '\\n');
  const publicKeyEscaped = publicKey.replace(/\n/g, '\\n');

  console.log('\n--- Chave Pública (Carregar no Portal AGT) ---');
  console.log(publicKey);

  console.log('--- Adicionando às variáveis de ambiente (.env) ---');
  
  const envContent = `\n# AGT Fiscal Keys\nAGT_PRIVATE_KEY="${privateKeyEscaped}"\nAGT_PUBLIC_KEY="${publicKeyEscaped}"\n`;
  
  fs.appendFileSync(envPath, envContent);

  console.log('Sucesso! Chaves geradas e guardadas no .env');
}

generateKeys().catch(console.error);
