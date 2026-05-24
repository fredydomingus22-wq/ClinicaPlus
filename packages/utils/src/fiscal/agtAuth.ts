import { AppError } from '../errors';

/**
 * Retorna credenciais no formato `username:password` a partir do ambiente.
 * (O header `Authorization: Basic ...` é montado pelo AgtApiClient.)
 */
export function getAgtBasicAuthFromEnv(): string | null {
  const username = process.env.AGT_USERNAME;
  const password = process.env.AGT_PASSWORD;
  if (!username || !password) return null;
  return `${username}:${password}`;
}

export function requireAgtBasicAuthFromEnv(): string {
  const auth = getAgtBasicAuthFromEnv();
  if (!auth) {
    throw new AppError('Credenciais AGT não configuradas (AGT_USERNAME/AGT_PASSWORD)', 500);
  }
  return auth;
}

/**
 * Para flows que suportam `AGT_MOCK=true`: devolve string vazia quando não há
 * credenciais, evitando duplicação de checks nos call sites.
 */
export function requireAgtBasicAuthFromEnvOrEmptyWhenMock(): string {
  const auth = getAgtBasicAuthFromEnv();
  if (auth) return auth;
  if (process.env.AGT_MOCK === 'true') return '';
  return requireAgtBasicAuthFromEnv();
}

/**
 * Constrói o valor do header `Authorization` para Basic Auth.
 *
 * Aceita:
 * - `Basic <...>` (retorna como está)
 * - `username:password` (gera Base64 e prefixa com `Basic`)
 * - `<base64(username:password)>` (prefixa com `Basic`)
 */
export function buildAgtBasicAuthHeaderValue(auth: string): string {
  if (!auth) return '';
  if (auth.startsWith('Basic ')) return auth;

  if (auth.includes(':')) {
    const b64 = Buffer.from(auth, 'utf8').toString('base64');
    return `Basic ${b64}`;
  }

  return `Basic ${auth}`;
}
