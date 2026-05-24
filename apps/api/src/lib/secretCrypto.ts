import { decryptSecret as decryptSecretCore, encryptSecret as encryptSecretCore } from '@clinicaplus/utils/server';
import { config } from './config';

export function encryptSecret(value: string): string {
  const material = process.env.SECRETS_ENCRYPTION_KEY ?? config.JWT_SECRET;
  return encryptSecretCore(value, material);
}

export function decryptSecret(value: string): string {
  const material = process.env.SECRETS_ENCRYPTION_KEY ?? config.JWT_SECRET;
  return decryptSecretCore(value, material);
}
