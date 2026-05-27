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

interface FetchLog {
  timestamp: string
  method: string
  url: string
  status?: number
  durationMs?: number
  requestBody?: unknown
  responseBody?: unknown
  error?: string
}

type LogLevel = 'info' | 'warn' | 'error'

function log(level: LogLevel, entry: FetchLog) {
  const prefix = `[apiFetch][${level.toUpperCase()}]`
  if (level === 'error') {
    console.error(prefix, JSON.stringify(entry, null, 2))
  } else if (level === 'warn') {
    console.warn(prefix, JSON.stringify(entry, null, 2))
  } else {
    // Só loga info em dev — evita poluir produção
    if (import.meta.env.DEV) {
      console.log(prefix, JSON.stringify(entry, null, 2))
    }
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
    public readonly url: string,
  ) {
    super(`${status} ${statusText} — ${url}`)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T = unknown>(
  input: string | URL,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const url = input.toString()
  const method = init?.method?.toUpperCase() ?? 'GET'
  const start = performance.now()

  // Conveniência: se `json` for passado, serializa e seta Content-Type
  const resolvedInit: RequestInit = { ...init }
  if (init?.json !== undefined) {
    resolvedInit.body = JSON.stringify(init.json)
    resolvedInit.headers = {
      'Content-Type': 'application/json',
      ...init?.headers,
    }
  }

  const logBase: Omit<FetchLog, 'status' | 'durationMs' | 'responseBody' | 'error'> = {
    timestamp: new Date().toISOString(),
    method,
    url,
    requestBody: init?.json ?? (init?.body ? '(non-json body)' : undefined),
  }

  let response: Response
  try {
    response = await fetch(input, resolvedInit)
  } catch (networkError) {
    // Erro de rede (sem conexão, CORS bloqueado, etc.)
    log('error', {
      ...logBase,
      durationMs: Math.round(performance.now() - start),
      error: networkError instanceof Error ? networkError.message : String(networkError),
    })
    throw networkError
  }

  const durationMs = Math.round(performance.now() - start)

  // Tenta parsear resposta como JSON; se falhar, retorna texto
  let responseBody: unknown
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    responseBody = await response.json().catch(() => null)
  } else {
    responseBody = await response.text().catch(() => null)
  }

  if (!response.ok) {
    log('error', {
      ...logBase,
      status: response.status,
      durationMs,
      responseBody,
    })
    throw new ApiError(response.status, response.statusText, responseBody, url)
  }

  log('info', {
    ...logBase,
    status: response.status,
    durationMs,
  })

  return responseBody as T
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
