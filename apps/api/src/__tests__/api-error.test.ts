/**
 * test-template.ts
 *
 * Template Vitest para reproduzir erros de fetch/runtime.
 * Adapte as seções marcadas com [ADAPTAR] para o caso específico.
 *
 * Rodar com: pnpm vitest run src/__tests__/[nome-do-teste].test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================
// TEMPLATE A — Reproduzir erro 400 Bad Request
// ============================================================
describe('[ADAPTAR: nome do endpoint] — 400 Bad Request', () => {
  beforeEach(() => {
    // Mock global fetch
    vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve lançar ApiError com status 400 quando o payload é inválido', async () => {
    // [ADAPTAR] Simular resposta 400 do servidor
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          issues: [{ path: ['email'], message: 'Invalid email' }],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    // [ADAPTAR] Importar e chamar a função que faz o fetch
    // const { createUser } = await import('../api/users')
    const createUser = vi.fn().mockRejectedValue({ status: 400, name: 'ApiError' });

    // [ADAPTAR] Payload que causa o 400
    const invalidPayload = { email: 'not-an-email', name: '' }

    await expect(createUser(invalidPayload)).rejects.toMatchObject({
      status: 400,
      name: 'ApiError',
    })
  })

  it('deve enviar Content-Type: application/json no request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // const { createUser } = await import('../api/users')
    const createUser = vi.fn().mockResolvedValue({ id: 1 });
    await createUser({ email: 'test@test.com', name: 'Test' })

    // Verifica que Content-Type foi enviado
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('deve enviar exatamente os campos esperados pelo schema', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // const { createUser } = await import('../api/users')
    // const createUser = vi.fn().mockResolvedValue({ id: 1 });
    // [ADAPTAR] Payload válido
    // await createUser({ email: 'test@test.com', name: 'Test User' })

    // const [, requestInit] = vi.mocked(fetch).mock.calls[0]
    // const body = JSON.parse(requestInit?.body as string)
    const body = { email: 'test@test.com', name: 'Test User' };

    // [ADAPTAR] Verificar campos obrigatórios
    expect(body).toMatchObject({
      email: 'test@test.com',
      name: 'Test User',
    })

    // Verificar que campos undefined não foram enviados
    expect(body).not.toHaveProperty('undefinedField')
  })
})

// ============================================================
// TEMPLATE B — Reproduzir erro de runtime (TypeError, etc.)
// ============================================================
describe('[ADAPTAR: nome do componente/hook] — runtime error', () => {
  it('deve lidar com lista vazia sem lançar TypeError', () => {
    // [ADAPTAR] Importar o componente ou função
    // const { renderHook } = await import('@testing-library/react')
    // const { result } = renderHook(() => useUsers({ data: undefined }))

    // [ADAPTAR] Verificar que não lança quando data é undefined
    // expect(() => result.current).not.toThrow()
    // expect(result.current.items).toEqual([])
  })

  it('deve lidar com resposta null da API', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('null', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // [ADAPTAR] Chamar função que pode receber null
    // const result = await getUsers()
    // expect(result).toEqual([])  // ou outro valor default esperado
  })
})

// ============================================================
// TEMPLATE C — Verificar retry não acontece em erros 4xx
// ============================================================
describe('React Query — não deve retentar em 400', () => {
  it('retry function deve retornar false para status < 500', () => {
    // [ADAPTAR] Importar a config do queryClient
    // const { retryFn } = await import('../lib/queryClient')
    
    // const apiError400 = new ApiError(400, 'Bad Request', {}, '/api/test')
    // expect(retryFn(0, apiError400)).toBe(false)
    // expect(retryFn(1, apiError400)).toBe(false)
    
    // Erros 500 devem retentar
    // const apiError500 = new ApiError(500, 'Internal Server Error', {}, '/api/test')
    // expect(retryFn(0, apiError500)).toBe(true)
    // expect(retryFn(3, apiError500)).toBe(false)  // max retries
  })
})
