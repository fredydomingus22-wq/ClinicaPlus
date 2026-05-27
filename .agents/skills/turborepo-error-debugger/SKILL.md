---
name: turborepo-error-debugger
description: >
  Diagnostica, explica e corrige erros em monorepos Turborepo com React e Vite.
  Use esta skill SEMPRE que o usuário mencionar erros, bugs, crashes ou comportamentos
  inesperados em projetos com Turborepo, React, Vite ou TypeScript — mesmo que o usuário
  não use a palavra "skill" ou "debugger". Trigger em frases como: "tô tendo um erro",
  "isso aqui não funciona", "o build quebrou", "400 bad request", "runtime error",
  "import não resolve", "o turbo falhou", "como eu debugo isso". Cobre: 400 Bad Request,
  erros de runtime JS/TS, build Vite, imports cross-package, e geração de logs + testes.
---

# Turborepo Error Debugger

Skill para diagnosticar erros em monorepos **Turborepo + React + Vite + TypeScript**.

## Fluxo obrigatório (sempre seguir esta ordem)

### FASE 1 — CLASSIFY
Antes de qualquer análise, classifique o erro em uma das categorias:

| Categoria | Sinais |
|---|---|
| `HTTP_400` | Mensagem de 400/Bad Request, fetch falhando, resposta de API |
| `RUNTIME_JS` | TypeError, ReferenceError, Cannot read properties, undefined is not a function |
| `BUILD_VITE` | "failed to resolve", "transform error", "plugin error", "cannot find module" no build |
| `TURBO_PIPELINE` | Erro no `turbo run`, cache miss inesperado, task falha sem output claro |
| `CROSS_PACKAGE` | Import de `packages/*` não resolvendo dentro de `apps/*` |

Se o usuário colou um stack trace ou log → leia `references/parse-stack.md` para extrair contexto.
Se o erro for `HTTP_400` → leia `references/400-patterns.md`.
Se o erro for `BUILD_VITE` ou `CROSS_PACKAGE` → leia `references/vite-turborepo.md`.

---

### FASE 2 — LOCATE
Determine **onde no monorepo** o erro está ocorrendo:

1. Qual `app` ou `package` é a origem? (ex: `apps/web`, `packages/ui`)
2. O erro é **local** (dentro de um único pacote) ou **cross-package** (um pacote depende de outro)?
3. Se cross-package: o `package.json` do pacote consumidor aponta para o pacote correto? O `turbo.json` tem a dependência de task correta?

**Perguntas a fazer ao usuário se não tiver contexto suficiente:**
- "Qual app do monorepo está com erro? (`apps/web`, `apps/dashboard`, etc.)"
- "O erro aparece no `turbo run dev` ou só em `turbo run build`?"
- "Me passa o stack trace completo ou o output do terminal"

---

### FASE 3 — DIAGNOSE
Aplique a heurística específica para a categoria identificada na Fase 1.

#### HTTP_400
Consulte `references/400-patterns.md` para a árvore de decisão completa.
Resumo das causas mais comuns:
- Payload não bate com o schema Zod do backend
- `Content-Type` header faltando ou incorreto
- Campos `undefined` sendo serializados (ou omitidos) no JSON
- Validação do react-query com dados stale sendo re-enviados

#### RUNTIME_JS
1. Leia o stack trace de cima para baixo — o **primeiro arquivo do seu projeto** (não de `node_modules`) é o ponto de entrada do bug
2. Verifique se o erro vem de um valor `undefined`/`null` não guardado
3. Cheque se é um problema de timing (dado async acessado antes de resolver)
4. Se TypeScript: verifique se o erro escapou do type-checker (uso de `any`, `as`, `!`)

#### BUILD_VITE
Consulte `references/vite-turborepo.md`.
Causas comuns:
- `resolve.alias` não configurado para imports de `packages/*`
- `optimizeDeps` não incluindo um pacote interno
- Plugin conflitando entre `apps/*` diferentes

#### TURBO_PIPELINE / CROSS_PACKAGE
Consulte `references/vite-turborepo.md`.
Causas comuns:
- `dependsOn` faltando no `turbo.json`
- `exports` do `package.json` do pacote interno apontando para arquivo inexistente
- TypeScript `paths` no `tsconfig.json` desalinhado com `exports`

---

### FASE 4 — FIX
Sempre entregue a correção neste formato:

```
### Causa raiz
[1-2 frases descrevendo exatamente o que causou o erro]

### Correção
[código com diff antes/depois ou snippet completo]

### Onde aplicar
[caminho exato: ex: apps/web/src/hooks/useFetch.ts, linha 42]

### Como verificar
[comando ou passo para confirmar que o fix funcionou]
```

---

### FASE 5 — LOG + TEST (sempre oferecer)

Após diagnosticar, **sempre ofereça**:

1. **Log estruturado**: snippet do fetch-wrapper com logging (veja `assets/fetch-wrapper.ts`)
2. **Teste de reprodução**: teste Vitest que reproduz o cenário do erro

Para gerar o teste, use o template em `assets/test-template.ts` e adapte para o caso específico.

---

## Regras gerais

- **Nunca** sugira `console.log` isolado — sempre proponha o fetch-wrapper ou um logger estruturado
- **Sempre** localize a correção no contexto do monorepo (qual `app/package`, qual arquivo)
- Se o erro puder ter múltiplas causas, liste todas em ordem de probabilidade
- Se precisar de mais contexto, faça **uma pergunta por vez**, a mais importante primeiro
- TypeScript é assumido como padrão — sugestões de fix devem ser type-safe

---

## Referências rápidas

| Arquivo | Quando ler |
|---|---|
| `references/400-patterns.md` | Qualquer erro HTTP 400 ou fetch falhando |
| `references/vite-turborepo.md` | Erros de build, import, plugin ou pipeline |
| `references/parse-stack.md` | Quando o usuário colar um stack trace |
| `assets/fetch-wrapper.ts` | Ao sugerir logging estruturado de requests |
| `assets/test-template.ts` | Ao gerar testes de reprodução |
| `scripts/diagnose.md` | Fluxo interativo de diagnóstico passo a passo |
