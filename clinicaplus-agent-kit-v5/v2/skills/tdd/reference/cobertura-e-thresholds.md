# Reference — Cobertura e Thresholds por Módulo

## Thresholds obrigatórios

| Módulo | Lines | Functions | Branches | Justificação |
|--------|-------|-----------|----------|--------------|
| `services/wa-*` | 85% | 85% | 80% | Lógica crítica de negócio |
| `services/subscricao*` | 90% | 90% | 85% | Billing — zero tolerância a regressão |
| `services/financeiro*` | 90% | 90% | 85% | Financeiro — idem |
| `lib/evolutionApi` | 75% | 75% | 70% | Cliente HTTP — mocks cobrem o resto |
| `lib/n8nApi` | 75% | 75% | 70% | Idem |
| `lib/n8n-templates/*` | 70% | 70% | 65% | Templates — testar output, não estrutura |
| `routes/whatsapp` | 80% | 80% | 75% | Integration tests cobrem maioria |
| `components/wa/*` | 75% | 75% | 70% | UI — Playwright cobre o resto |

## Configuração por package

```typescript
// apps/api/vitest.config.ts — thresholds por pasta
coverage: {
  thresholds: {
    'src/services/wa-*':        { lines: 85, functions: 85, branches: 80 },
    'src/services/subscricao*': { lines: 90, functions: 90, branches: 85 },
    'src/lib/evolutionApi*':    { lines: 75, functions: 75, branches: 70 },
    'src/lib/n8nApi*':          { lines: 75, functions: 75, branches: 70 },
    'src/routes/whatsapp*':     { lines: 80, functions: 80, branches: 75 },
  },
}
```

## O que NÃO contar para coverage

```typescript
// Excluir do coverage — não são lógica de negócio
exclude: [
  'src/test/**',
  'src/seeds/**',
  'src/**/*.d.ts',
  'src/lib/n8n-templates/**',  // templates são JSON — testar via service
  'src/lib/config.ts',
]
```

## Correr coverage em CI

```yaml
# .github/workflows — job de testes
- name: Test with coverage
  run: pnpm test --run --coverage --filter=api

- name: Check thresholds
  run: pnpm test --run --coverage --coverage.reporter=json-summary --filter=api
  # Falha se thresholds não forem atingidos
```
