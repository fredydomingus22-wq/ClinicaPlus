# Erros de Vite e Turborepo em Monorepos

## Índice
1. [Imports cross-package não resolvendo](#1-imports-cross-package)
2. [Erros de build Vite](#2-erros-de-build-vite)
3. [Pipeline Turborepo falhando](#3-pipeline-turborepo)
4. [TypeScript paths desalinhado](#4-typescript-paths)
5. [HMR não funcionando entre packages](#5-hmr)

---

## 1. Imports cross-package

### Sintoma
```
Error: Failed to resolve import "packages/ui/Button" from "apps/web/src/App.tsx"
```

### Diagnóstico
O problema geralmente está em **um de três lugares**:

**A) `package.json` do pacote interno com `exports` incorreto**
```json
// packages/ui/package.json

// ❌ Apontando para arquivo que não existe ou não foi buildado
{
  "exports": {
    ".": "./dist/index.js"  // dist/ não existe em dev
  }
}

// ✅ Fix: usar exports condicional com source para dev
{
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "default": "./dist/index.js"
    }
  },
  "main": "./src/index.ts"
}
```

**B) `vite.config.ts` sem alias para packages internos**
```typescript
// apps/web/vite.config.ts

// ❌ Sem alias — Vite não sabe onde achar @repo/ui
export default defineConfig({ ... })

// ✅ Fix
import { resolve } from 'path'
export default defineConfig({
  resolve: {
    alias: {
      '@repo/ui': resolve(__dirname, '../../packages/ui/src'),
    },
  },
})
```

**C) `optimizeDeps` não incluindo o pacote**
```typescript
// Vite pré-bundla dependências — pacotes internos podem precisar ser excluídos
export default defineConfig({
  optimizeDeps: {
    exclude: ['@repo/ui'],  // evita que Vite tente pré-bundlar pacote local
  },
})
```

---

## 2. Erros de build Vite

### "transform error" ou "plugin error"

**Diagnóstico passo a passo:**
1. Rode `turbo run build --filter=apps/web` isoladamente
2. Se funcionar isolado mas falhar no `turbo run build` global → problema de ordem de build (ver Seção 3)
3. Se falhar isolado → problema no `vite.config.ts` do app

**Causas comuns:**

```typescript
// Causa: plugin aplicado no app que conflita com transformação de pacote interno
// Ex: @vitejs/plugin-react aplicado duas vezes

// ✅ Fix: verificar se packages/* têm seu próprio vite.config.ts
// e se os plugins não se duplicam
```

### "Cannot find module" no build (mas funciona em dev)

Diferença crucial: Vite em dev usa ESM nativo, build usa Rollup.

```typescript
// ❌ Import dinâmico com path que só funciona em dev
const mod = await import(`../../../packages/${name}`)

// ✅ Fix: imports estáticos sempre que possível
import { Component } from '@repo/ui'
```

### Build TypeScript falhando (mas tsc local passa)

```bash
# Verificar se turbo está rodando build na ordem certa
# O packages/* deve buildar antes do apps/*

# turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],  # ^ significa "dependências primeiro"
      "outputs": ["dist/**"]
    }
  }
}
```

---

## 3. Pipeline Turborepo

### Task falhando sem mensagem de erro clara

```bash
# Rodar com verbosidade máxima para ver o output real
turbo run build --verbosity=2

# Forçar re-run sem cache (descartar cache corrompido)
turbo run build --force
```

### Cache invalidando sempre (build lento)

```json
// turbo.json — verificar se inputs está configurado
{
  "pipeline": {
    "build": {
      "inputs": ["src/**", "package.json", "tsconfig.json"],
      "outputs": ["dist/**"]
    }
  }
}
```

Causas de cache sempre invalidar:
- Arquivo gerado (ex: `dist/`) sendo incluído nos inputs
- Variável de ambiente não declarada em `globalEnv`
- Clock do sistema variando (comum em Docker)

### Task de `apps/*` rodando antes de `packages/*` buildar

```json
// turbo.json — garantir ordem correta
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]  // ^ = "rode build das dependências primeiro"
    },
    "dev": {
      "dependsOn": ["^build"],  // packages precisam ter build antes do dev do app
      "cache": false,
      "persistent": true
    }
  }
}
```

### Verificar grafo de dependências
```bash
# Visualizar quais tasks dependem de quais
turbo run build --graph

# Filtrar para um app específico e suas dependências
turbo run build --filter=apps/web...
```

---

## 4. TypeScript paths desalinhado

O erro mais comum: `tsconfig.json` tem paths mas `vite.config.ts` não tem o alias correspondente (ou vice-versa).

### Configuração alinhada (template)

```json
// tsconfig.base.json (raiz do monorepo)
{
  "compilerOptions": {
    "paths": {
      "@repo/ui": ["./packages/ui/src/index.ts"],
      "@repo/utils": ["./packages/utils/src/index.ts"]
    }
  }
}
```

```typescript
// apps/web/vite.config.ts — deve espelhar exatamente os paths do tsconfig
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@repo/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@repo/utils': resolve(__dirname, '../../packages/utils/src/index.ts'),
    },
  },
})
```

**Dica:** Use o plugin `vite-tsconfig-paths` para sincronizar automaticamente:
```bash
pnpm add -D vite-tsconfig-paths
```
```typescript
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
})
```

---

## 5. HMR não funcionando entre packages

Quando você edita `packages/ui` mas `apps/web` não atualiza:

```typescript
// apps/web/vite.config.ts
export default defineConfig({
  server: {
    watch: {
      // Incluir packages/* no watch do Vite
      ignored: ['!**/node_modules/@repo/**'],
    },
  },
  optimizeDeps: {
    exclude: ['@repo/ui'],  // não pré-bundlar pacote local
  },
})
```

Se o pacote usa TypeScript e precisa ser transpilado:
```json
// packages/ui/package.json
{
  "scripts": {
    "dev": "tsc --watch --preserveWatchOutput"
  }
}
```
E no `turbo.json`, garantir que o `dev` do app depende do `dev` dos packages.
