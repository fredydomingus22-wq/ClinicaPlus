# Padrões de 400 Bad Request

## Árvore de decisão

```
O fetch retornou 400?
│
├── O request chega ao servidor?
│   ├── NÃO → problema de CORS, proxy, ou URL errada
│   └── SIM → continua abaixo
│
├── O servidor tem validação de schema (Zod)?
│   ├── SIM → checar se o payload bate com o schema (ver Seção A)
│   └── NÃO → checar headers e serialização (ver Seção B)
│
└── É um request de mutation (POST/PUT/PATCH)?
    ├── SIM → checar Content-Type e body (ver Seção C)
    └── NÃO (GET) → checar query params (ver Seção D)
```

---

## Seção A — Validação Zod falhando

### Sintomas
- Resposta do servidor inclui mensagem como `"issues": [...]` ou `"validation error"`
- Status 400 apenas em alguns inputs, não em todos

### Causas e fixes

**Causa 1: Campo obrigatório chegando `undefined`**
```typescript
// ❌ Problema: campo pode ser undefined se o usuário não preencheu
const body = {
  name: formData.name,   // pode ser undefined
  email: formData.email,
}

// ✅ Fix: garantir valor padrão ou validar antes de enviar
const body = {
  name: formData.name ?? '',
  email: formData.email ?? '',
}
```

**Causa 2: Tipo errado (string onde se espera number)**
```typescript
// ❌ Problema: input HTML sempre retorna string
const body = { age: e.target.value }  // "25" em vez de 25

// ✅ Fix: coerção explícita
const body = { age: Number(e.target.value) }
```

**Causa 3: Campo extra não esperado pelo schema (modo strict)**
```typescript
// Se o schema Zod usa .strict(), campos extras causam 400
// ✅ Fix: remover campos não usados do payload ou mudar schema para .strip()
```

**Causa 4: Data como string em formato errado**
```typescript
// ❌ Problema: formato local, não ISO
const body = { date: new Date().toLocaleDateString() }  // "15/03/2026"

// ✅ Fix: sempre ISO 8601
const body = { date: new Date().toISOString() }
```

### Como inspecionar o erro Zod
Se você controla o backend, adicione isso temporariamente para ver o erro completo:
```typescript
// No catch do handler (Hono, Express, Next.js API route)
if (error instanceof ZodError) {
  console.log(JSON.stringify(error.flatten(), null, 2))
  return res.status(400).json({ issues: error.flatten() })
}
```

---

## Seção B — Headers incorretos

### Content-Type faltando
```typescript
// ❌ Problema: fetch sem Content-Type para body JSON
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify(data),  // body JSON mas sem header
})

// ✅ Fix
fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})
```

### Authorization header faltando
```typescript
// ✅ Verificar se o token está sendo enviado
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

---

## Seção C — Body malformado

### JSON.stringify de valor inválido
```typescript
// ❌ Problema: undefined é omitido no JSON.stringify
const data = { name: 'João', extra: undefined }
JSON.stringify(data)  // '{"name":"João"}' — campo `extra` sumiu

// ❌ Problema: circular reference
JSON.stringify(objectWithCircularRef)  // throws

// ✅ Fix: validar antes de serializar
const payload = JSON.parse(JSON.stringify(data))  // remove undefined
```

### FormData vs JSON
```typescript
// ❌ Problema: enviando FormData mas servidor espera JSON
const form = new FormData()
form.append('name', 'João')
fetch('/api', { method: 'POST', body: form })
// Content-Type vira multipart/form-data, não application/json

// ✅ Fix: converter para objeto e serializar como JSON
const body = Object.fromEntries(form.entries())
fetch('/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
```

---

## Seção D — Query params (GET 400)

```typescript
// ❌ Problema: caracteres especiais não encodados
fetch(`/api/search?q=${userInput}`)  // pode ter &, =, espaços

// ✅ Fix
fetch(`/api/search?q=${encodeURIComponent(userInput)}`)

// Ou com URLSearchParams
const params = new URLSearchParams({ q: userInput, page: '1' })
fetch(`/api/search?${params}`)
```

---

## Padrões com React Query

### Dados stale sendo reenviados em mutation
```typescript
// ❌ Problema: onMutate com snapshot que pode ter dados velhos
useMutation({
  mutationFn: (data) => api.update(data),
  // sem invalidação após sucesso → próxima mutation usa cache stale
})

// ✅ Fix: sempre invalidar após sucesso
useMutation({
  mutationFn: (data) => api.update(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] })
  },
})
```

### Retry automático em erro 400
```typescript
// ❌ Problema: React Query retenta requests por padrão — 400 vai ser chamado 3x
// ✅ Fix: desabilitar retry para erros 4xx
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 3
      },
    },
  },
})
```
