# Sprint 7 — Qualidade (Playwright + k6)

**Skill:** `docs/08-testing/TESTING_v2.md`

---

## Prompt 7.1 — Playwright E2E

```
Lê docs/TESTING_v2.md (secções 1, 2, 3).

1. Instala: pnpm add -D @playwright/test --filter=web
   npx playwright install --with-deps chromium firefox

2. Cria apps/web/playwright.config.ts (ver TESTING_v2.md secção 1)

3. Cria apps/web/e2e/pages/:
   LoginPage.ts, HojePage.ts, FaturaPage.ts

4. Cria os 4 spec files (ver TESTING_v2.md secção 3):
   e2e/auth.spec.ts         — 4 testes (login, erro, refresh, localStorage)
   e2e/booking.spec.ts      — 2 testes (criar marcação, cancelar)
   e2e/financial.spec.ts    — 1 teste (criar fatura + pagamento)
   e2e/realtime.spec.ts     — 1 teste (dois browsers, actualização < 2s)

5. Adiciona ao package.json de apps/web:
   "test:e2e": "playwright test"
   "test:e2e:report": "playwright show-report"

6. Corre: pnpm test:e2e --filter=web
   Se algum teste falhar: analisar screenshot e corrigir antes de avançar

Reporta: output completo do Playwright (número de testes, passados/falhados, duração)
```

---

## Prompt 7.2 — k6 Load Test + CI Update

```
Lê docs/TESTING_v2.md (secções 4, 5).

1. Cria k6/load-agendamentos.js (ver TESTING_v2.md secção 4):
   - stages: ramp up 10 → carga 50 → pico 100 → ramp down
   - thresholds: p95 < 500ms, error rate < 1%, slot latency p95 < 300ms

2. Corre contra staging (não produção):
   k6 run k6/load-agendamentos.js --env BASE_URL=<staging-api-url>

3. Se thresholds passam → continuar; se falham → investigar e optimizar

4. Actualiza .github/workflows/ci.yml com os jobs E2E e load-test
   (ver TESTING_v2.md secção 5)

5. Commit e push:
   git add .
   git commit -m "test: add Playwright E2E and k6 load tests"
   git push origin main

6. Verifica que o CI pipeline passa completamente (todos os jobs verdes)

Checkpoint Final v2:
   - [ ] Playwright: 8 testes verdes em chromium e firefox
   - [ ] k6: todos os thresholds verdes em staging
   - [ ] CI: todos os jobs verdes (validate + e2e + migrate + worker deploy)
   - [ ] pnpm test --run --coverage ≥ 85% services
   - [ ] bash scripts/health-check.sh prod → tudo verde
   - [ ] curl https://api.clinicaplus.ao/health → "status": "ok", "redis": "connected"
   - [ ] Nenhum endpoint v1 quebrado (smoke test completo)
```
