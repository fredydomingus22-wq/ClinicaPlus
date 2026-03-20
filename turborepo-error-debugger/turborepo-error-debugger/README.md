# turborepo-error-debugger

Skill + scripts para diagnosticar e corrigir erros em monorepos **Turborepo + React + Vite + TypeScript**.

## Estrutura

```
turborepo-error-debugger/
├── SKILL.md                        ← instrução principal da skill (para Claude)
├── README.md                       ← este arquivo
│
├── scripts/                        ← rode direto no terminal
│   ├── adopt.ts                    ← instala os assets no seu monorepo
│   ├── diagnose.ts                 ← diagnóstico interativo de erros
│   └── test.ts                     ← valida e roda testes
│
├── assets/                         ← arquivos prontos para copiar no projeto
│   ├── fetch-wrapper.ts            ← wrapper de fetch com logging + ApiError
│   └── test-template.ts            ← templates Vitest para erros comuns
│
└── references/                     ← documentação consultada pela skill
    ├── 400-patterns.md             ← padrões de 400 Bad Request
    ├── vite-turborepo.md           ← erros de build, imports, pipeline
    └── parse-stack.md              ← como ler stack traces
```

---

## Instalação na IDE

### Opção 1 — Skill no Claude (recomendado)

Instale o arquivo `.skill` no Claude para ativar o assistente de diagnóstico automático.

### Opção 2 — Scripts no monorepo

Copie a pasta `scripts/` para a raiz do seu monorepo e rode com `npx tsx`:

```bash
# Na raiz do seu monorepo
cp -r turborepo-error-debugger/scripts ./debug-scripts

# Adotar assets (fetch-wrapper, queryClient, etc.)
npx tsx debug-scripts/adopt.ts

# Diagnosticar um erro
npx tsx debug-scripts/diagnose.ts

# Rodar verificações e testes
npx tsx debug-scripts/test.ts
```

---

## Scripts — referência rápida

### `adopt.ts` — Instalar assets no monorepo

```bash
npx tsx scripts/adopt.ts                    # interativo, detecta apps automaticamente
npx tsx scripts/adopt.ts --app apps/web     # especificar app alvo
npx tsx scripts/adopt.ts --dry-run          # ver o que seria feito sem escrever nada
```

**O que faz:**
- Copia `fetch-wrapper.ts` para `apps/[app]/src/lib/`
- Copia o template de testes para `apps/[app]/src/__tests__/`
- Cria ou sugere atualização do `queryClient.ts` com retry inteligente
- Verifica `vite.config.ts` e avisa aliases faltando
- Verifica `turbo.json` e avisa dependências de task faltando

---

### `diagnose.ts` — Diagnóstico interativo

```bash
npx tsx scripts/diagnose.ts                                    # modo interativo (cola o erro)
npx tsx scripts/diagnose.ts --error "Cannot read properties"   # erro inline
npx tsx scripts/diagnose.ts --file error.log                   # ler de arquivo
npx tsx scripts/diagnose.ts --fix                              # aplicar fixes automáticos
```

**O que faz:**
- Classifica o erro: `HTTP_400`, `RUNTIME_JS`, `BUILD_VITE`, `TURBO_PIPELINE`, `CROSS_PACKAGE`
- Extrai arquivo/linha do stack trace
- Lista causas em ordem de probabilidade com fix sugerido
- Aplica fixes automáticos quando possível (ex: limpar cache do Turborepo)

---

### `test.ts` — Testes e validação

```bash
npx tsx scripts/test.ts                         # tudo
npx tsx scripts/test.ts --category 400          # só testes de 400 Bad Request
npx tsx scripts/test.ts --category runtime      # só erros de runtime
npx tsx scripts/test.ts --category cross-package # só erros de import
npx tsx scripts/test.ts --generate              # gerar arquivos de teste no projeto
npx tsx scripts/test.ts --watch                 # modo watch (Vitest)
```

**O que faz:**
- Verificações estáticas: `turbo.json`, `package.json` exports, aliases do Vite
- Cobertura de error handling: detecta `fetch()` sem `try/catch` ou `.catch()`
- Roda Vitest nas apps que têm o setup
- Gera arquivos de teste baseados no template

---

## Assets — referência rápida

### `fetch-wrapper.ts`

Wrapper de `fetch` com:
- Log estruturado automático (só em dev)
- `ApiError` com `status`, `body` e `url`
- Suporte a `{ json: data }` (serializa + seta Content-Type automaticamente)
- Integração com React Query retry

```typescript
import { apiFetch, ApiError } from '@/lib/fetch-wrapper'

// GET
const data = await apiFetch<User[]>('/api/users')

// POST com JSON
const user = await apiFetch<User>('/api/users', {
  method: 'POST',
  json: { name: 'João', email: 'joao@test.com' },
})

// Tratamento de erro
try {
  await apiFetch('/api/resource', { json: payload })
} catch (error) {
  if (error instanceof ApiError && error.status === 400) {
    console.log('Payload inválido:', error.body)
  }
}
```

### `test-template.ts`

Templates prontos para:
- Reproduzir erro 400 com payload inválido
- Verificar que Content-Type é enviado
- Verificar campos do payload
- Testar erro de runtime com dado undefined
- Verificar que React Query não retenta em 4xx

---

## Categorias de erro cobertas

| Categoria | Exemplos |
|---|---|
| `HTTP_400` | Payload inválido, schema Zod falhando, Content-Type errado |
| `RUNTIME_JS` | TypeError, undefined.map(), is not a function |
| `BUILD_VITE` | transform error, plugin crash, cannot find module |
| `TURBO_PIPELINE` | build fora de ordem, cache corrompido, dependsOn faltando |
| `CROSS_PACKAGE` | @repo/ui não resolve, exports incorreto, vite alias faltando |
