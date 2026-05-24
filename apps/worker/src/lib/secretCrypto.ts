import { decryptSecret as decryptSecretCore } from '@clinicaplus/utils/server';

function getKeyMaterial(): string | null {
  return process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET || null;
}

export function decryptSecret(value: string): string {
  const keyMaterial = getKeyMaterial();

  // Se não estiver encriptado, devolve como está.
  if (!value.startsWith('v1:')) {
    return value;
  }

  if (!keyMaterial) {
    throw new Error('SECRETS_ENCRYPTION_KEY/JWT_SECRET não configurado para desencriptar segredos (worker)');
  }

  return decryptSecretCore(value, keyMaterial);
}

