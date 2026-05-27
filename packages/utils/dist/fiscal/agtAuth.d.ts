/**
 * Retorna credenciais no formato `username:password` a partir do ambiente.
 * (O header `Authorization: Basic ...` é montado pelo AgtApiClient.)
 */
export declare function getAgtBasicAuthFromEnv(): string | null;
export declare function requireAgtBasicAuthFromEnv(): string;
/**
 * Para flows que suportam `AGT_MOCK=true`: devolve string vazia quando não há
 * credenciais, evitando duplicação de checks nos call sites.
 */
export declare function requireAgtBasicAuthFromEnvOrEmptyWhenMock(): string;
/**
 * Constrói o valor do header `Authorization` para Basic Auth.
 *
 * Aceita:
 * - `Basic <...>` (retorna como está)
 * - `username:password` (gera Base64 e prefixa com `Basic`)
 * - `<base64(username:password)>` (prefixa com `Basic`)
 */
export declare function buildAgtBasicAuthHeaderValue(auth: string): string;
//# sourceMappingURL=agtAuth.d.ts.map