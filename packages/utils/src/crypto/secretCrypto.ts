import crypto from 'crypto';

const PREFIX = 'v1:';

function deriveKey(material: string): Buffer {
  return crypto.createHash('sha256').update(material).digest();
}

export function encryptSecret(value: string, keyMaterial: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string, keyMaterial: string): string {
  if (!value.startsWith(PREFIX)) {
    return value;
  }

  const [ivBase64, tagBase64, encryptedBase64] = value.slice(PREFIX.length).split(':');
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted secret format');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveKey(keyMaterial),
    Buffer.from(ivBase64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

