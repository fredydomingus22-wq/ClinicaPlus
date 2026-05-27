"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgtBasicAuthFromEnv = getAgtBasicAuthFromEnv;
exports.requireAgtBasicAuthFromEnv = requireAgtBasicAuthFromEnv;
exports.requireAgtBasicAuthFromEnvOrEmptyWhenMock = requireAgtBasicAuthFromEnvOrEmptyWhenMock;
exports.buildAgtBasicAuthHeaderValue = buildAgtBasicAuthHeaderValue;
const errors_1 = require("../errors");
/**
 * Retorna credenciais no formato `username:password` a partir do ambiente.
 * (O header `Authorization: Basic ...` é montado pelo AgtApiClient.)
 */
function getAgtBasicAuthFromEnv() {
    const username = process.env.AGT_USERNAME;
    const password = process.env.AGT_PASSWORD;
    if (!username || !password)
        return null;
    return `${username}:${password}`;
}
function requireAgtBasicAuthFromEnv() {
    const auth = getAgtBasicAuthFromEnv();
    if (!auth) {
        throw new errors_1.AppError('Credenciais AGT não configuradas (AGT_USERNAME/AGT_PASSWORD)', 500);
    }
    return auth;
}
/**
 * Para flows que suportam `AGT_MOCK=true`: devolve string vazia quando não há
 * credenciais, evitando duplicação de checks nos call sites.
 */
function requireAgtBasicAuthFromEnvOrEmptyWhenMock() {
    const auth = getAgtBasicAuthFromEnv();
    if (auth)
        return auth;
    if (process.env.AGT_MOCK === 'true')
        return '';
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
function buildAgtBasicAuthHeaderValue(auth) {
    if (!auth)
        return '';
    if (auth.startsWith('Basic '))
        return auth;
    if (auth.includes(':')) {
        const b64 = Buffer.from(auth, 'utf8').toString('base64');
        return `Basic ${b64}`;
    }
    return `Basic ${auth}`;
}
//# sourceMappingURL=agtAuth.js.map