"use strict";
/**
 * fetch-wrapper.ts
 *
 * Wrapper de fetch com logging estruturado para debug de erros em monorepos.
 * Coloque em: packages/api-client/src/fetch-wrapper.ts
 * ou em:      apps/web/src/lib/fetch-wrapper.ts
 *
 * Uso:
 *   import { apiFetch } from '@/lib/fetch-wrapper'
 *   const data = await apiFetch('/api/users', { method: 'POST', body: payload })
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.apiFetch = apiFetch;
function log(level, entry) {
    const prefix = `[apiFetch][${level.toUpperCase()}]`;
    if (level === 'error') {
        // eslint-disable-next-line no-console
        console.error(prefix, JSON.stringify(entry, null, 2));
    }
    else if (level === 'warn') {
        // eslint-disable-next-line no-console
        console.warn(prefix, JSON.stringify(entry, null, 2));
    }
    else {
        // Só loga info em dev — evita poluir produção
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log(prefix, JSON.stringify(entry, null, 2));
        }
    }
}
class ApiError extends Error {
    constructor(status, statusText, body, url) {
        super(`${status} ${statusText} — ${url}`);
        this.status = status;
        this.statusText = statusText;
        this.body = body;
        this.url = url;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
async function apiFetch(input, init) {
    const url = input.toString();
    const method = init?.method?.toUpperCase() ?? 'GET';
    const start = performance.now();
    // Conveniência: se `json` for passado, serializa e seta Content-Type
    const resolvedInit = { ...init };
    if (init?.json !== undefined) {
        resolvedInit.body = JSON.stringify(init.json);
        resolvedInit.headers = {
            'Content-Type': 'application/json',
            ...init?.headers,
        };
    }
    const logBase = {
        timestamp: new Date().toISOString(),
        method,
        url,
        requestBody: init?.json ?? (init?.body ? '(non-json body)' : undefined),
    };
    let response;
    try {
        response = await fetch(input, resolvedInit);
    }
    catch (networkError) {
        // Erro de rede (sem conexão, CORS bloqueado, etc.)
        log('error', {
            ...logBase,
            durationMs: Math.round(performance.now() - start),
            error: networkError instanceof Error ? networkError.message : String(networkError),
        });
        throw networkError;
    }
    const durationMs = Math.round(performance.now() - start);
    // Tenta parsear resposta como JSON; se falhar, retorna texto
    let responseBody;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        responseBody = await response.json().catch(() => null);
    }
    else {
        responseBody = await response.text().catch(() => null);
    }
    if (!response.ok) {
        log('error', {
            ...logBase,
            status: response.status,
            durationMs,
            responseBody,
        });
        throw new ApiError(response.status, response.statusText, responseBody, url);
    }
    log('info', {
        ...logBase,
        status: response.status,
        durationMs,
    });
    return responseBody;
}
/**
 * Integração com React Query
 *
 * No seu QueryClient, configure retry para não re-tentar erros 4xx:
 *
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       retry: (failureCount, error) => {
 *         if (error instanceof ApiError && error.status < 500) return false
 *         return failureCount < 2
 *       },
 *     },
 *     mutations: {
 *       retry: (failureCount, error) => {
 *         if (error instanceof ApiError && error.status < 500) return false
 *         return failureCount < 2
 *       },
 *     },
 *   },
 * })
 */
