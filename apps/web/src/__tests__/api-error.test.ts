/**
 * api-error.test.ts
 *
 * Testes autónomos do fetch-wrapper e tratamento de erros HTTP.
 * Funcionam sem adaptação — testam o fetch-wrapper instalado pela skill.
 *
 * Para adicionar testes do seu código, copie os blocos "TEMPLATE" no final
 * e substitua as secções marcadas com [SEU CÓDIGO].
 *
 * Rodar: pnpm vitest run src/__tests__/api-error.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, ApiError } from '../lib/fetch-wrapper'

// ── Helpers ───────────────────────────────────────────────────────────────────
function mockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Suite 1 — ApiError em respostas 4xx/5xx ───────────────────────────────────
describe('apiFetch — erros HTTP', () => {
  beforeEach(() => { vi.spyOn(global, 'fetch') })
  afterEach(() => { vi.restoreAllMocks() })

  it('lança ApiError com status 400', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({ issues: [{ path: ['email'], message: 'Invalid email' }] }, 400)
    )
    await expect(apiFetch('/api/test', { method: 'POST', json: { email: 'x' } }))
      .rejects.toMatchObject({ name: 'ApiError', status: 400 })
  })

  it('lança ApiError com status 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ error: 'Unauthorized' }, 401))
    await expect(apiFetch('/api/protected'))
      .rejects.toMatchObject({ name: 'ApiError', status: 401 })
  })

  it('lança ApiError com status 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ error: 'Not found' }, 404))
    await expect(apiFetch('/api/missing'))
      .rejects.toMatchObject({ name: 'ApiError', status: 404 })
  })

  it('lança ApiError com status 500', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ error: 'Internal error' }, 500))
    await expect(apiFetch('/api/broken'))
      .rejects.toMatchObject({ name: 'ApiError', status: 500 })
  })

  it('expõe o body da resposta de erro', async () => {
    const errorBody = { issues: [{ field: 'email', message: 'required' }] }
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse(errorBody, 400))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error: any = await apiFetch('/api/test').catch((e: any) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.body).toMatchObject(errorBody)
  })

  it('retorna dados em resposta 200', async () => {
    const payload = { id: 1, name: 'João' }
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse(payload, 200))
    const result = await apiFetch('/api/users/1')
    expect(result).toMatchObject(payload)
  })
})

// ── Suite 2 — Headers e serialização ─────────────────────────────────────────
describe('apiFetch — headers e body', () => {
  beforeEach(() => { vi.spyOn(global, 'fetch') })
  afterEach(() => { vi.restoreAllMocks() })

  it('envia Content-Type: application/json quando usa { json }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ ok: true }))
    await apiFetch('/api/users', { method: 'POST', json: { name: 'Test' } })
    expect(fetch).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({
        method: 'POST'
      })
    )
  })

  it('serializa o body JSON correctamente', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ ok: true }))
    const payload = { name: 'Maria', age: 30 }
    await apiFetch('/api/users', { method: 'POST', json: payload })
    const calls = vi.mocked(fetch).mock.calls
    const firstCall = calls[0]
    if (!firstCall) throw new Error('Fetch was not called')
    const [, init] = firstCall
    expect(JSON.parse(init?.body as string)).toMatchObject(payload)
  })

  it('não inclui campos undefined no body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ ok: true }))
    await apiFetch('/api/users', { method: 'POST', json: { name: 'Ana', extra: undefined } })
    const calls = vi.mocked(fetch).mock.calls
    const firstCall = calls[0]
    if (!firstCall) throw new Error('Fetch was not called')
    const [, init] = firstCall
    const body = JSON.parse(init?.body as string)
    expect(body).not.toHaveProperty('extra')
  })
})

// ── Suite 3 — Erros de rede ───────────────────────────────────────────────────
describe('apiFetch — erros de rede', () => {
  beforeEach(() => { vi.spyOn(global, 'fetch') })
  afterEach(() => { vi.restoreAllMocks() })

  it('propaga erro de rede (sem conexão, CORS, etc.)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(apiFetch('/api/users')).rejects.toThrow('Failed to fetch')
  })
})

// ── Suite 4 — ApiError como classe ───────────────────────────────────────────
describe('ApiError', () => {
  it('é instância de Error', () => {
    const err = new ApiError(400, 'Bad Request', {}, '/api/test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })

  it('tem propriedades status, body e url', () => {
    const body = { message: 'invalid' }
    const err = new ApiError(422, 'Unprocessable Entity', body, '/api/items')
    expect(err.status).toBe(422)
    expect(err.body).toMatchObject(body)
    expect(err.url).toBe('/api/items')
  })

  it('distingue 4xx de 5xx para lógica de retry', () => {
    const client = new ApiError(400, 'Bad Request', {}, '/api/test')
    const server = new ApiError(503, 'Service Unavailable', {}, '/api/test')
    expect(client.status < 500).toBe(true)   // nunca retentar
    expect(server.status >= 500).toBe(true)  // pode retentar
  })
})

// ════════════════════════════════════════════════════════════════════════════════
// TEMPLATES — copie e adapte para o seu código
// ════════════════════════════════════════════════════════════════════════════════

// TEMPLATE: Testar um endpoint específico do seu projecto
//
// describe('[SEU ENDPOINT] — POST /api/[recurso]', () => {
//   beforeEach(() => { vi.spyOn(global, 'fetch') })
//   afterEach(() => { vi.restoreAllMocks() })
//
//   it('retorna 400 quando [campo] é inválido', async () => {
//     vi.mocked(fetch).mockResolvedValueOnce(
//       mockResponse({ issues: [{ path: ['[campo]'], message: 'required' }] }, 400)
//     )
//     const { criarRecurso } = await import('../api/[recurso]')
//     await expect(criarRecurso({ [campo]: '' }))
//       .rejects.toMatchObject({ status: 400 })
//   })
// })
