# ClinicaPlus v2 — Testing (Delta)

Delta em relação a `08-testing/TESTING.md` (v1). Adiciona E2E com Playwright e load tests com k6.

---

## 1. Playwright — Configuração

```bash
pnpm add -D @playwright/test --filter=web
npx playwright install --with-deps chromium firefox
```

```typescript
// apps/web/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [process.env.CI ? ['github'] : ['html'], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox'  } },
  ],
});
```

---

## 2. Page Objects

```typescript
// e2e/pages/LoginPage.ts
import { type Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/login'); }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Palavra-passe').fill(password);
    await this.page.getByRole('button', { name: 'Entrar' }).click();
  }

  get errorMessage() { return this.page.getByRole('alert'); }
}

// e2e/pages/HojePage.ts
export class HojePage {
  constructor(private page: Page) {}

  get realtimeBadge() { return this.page.getByText('Tempo real'); }
  get agendamentoCards() { return this.page.locator('[data-testid="agendamento-card"]'); }
  get loadingIndicator() { return this.page.getByTestId('loading'); }
}
```

---

## 3. Spec Files

### auth.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Autenticação', () => {

  test('login válido → redireciona para dashboard', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('admin@demo.ao', 'Demo1234!');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('login inválido → mensagem de erro em português', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('admin@demo.ao', 'senha-errada');
    await expect(lp.errorMessage).toBeVisible();
    await expect(lp.errorMessage).not.toBeEmpty();
    // Verificar que está em português
    const text = await lp.errorMessage.textContent();
    expect(text).not.toMatch(/error|invalid|wrong/i); // não deve estar em inglês
  });

  test('refresh da página → sessão restaurada sem flash de login', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('admin@demo.ao', 'Demo1234!');
    await page.waitForURL(/\/admin/);
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('token nunca em localStorage', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('admin@demo.ao', 'Demo1234!');
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).not.toContain('token');
    expect(stored).not.toContain('Bearer');
    expect(stored).not.toContain('cp_');
  });

});
```

### booking.spec.ts

```typescript
test.describe('Marcação de Consulta (Paciente)', () => {

  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).goto();
    await new LoginPage(page).login('joao@demo.ao', 'Demo1234!');
    await page.waitForURL(/\/paciente/);
  });

  test('criar marcação end-to-end', async ({ page }) => {
    await page.getByRole('link', { name: 'Marcar Consulta' }).click();
    await page.getByText('Cardiologia').click();
    await page.getByText('Dr. Carlos').click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.locator('[data-testid="slot-button"]').first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Motivo').fill('Consulta de rotina');
    await page.getByRole('button', { name: 'Confirmar Marcação' }).click();
    await expect(page.getByText(/sucesso|confirmad/i)).toBeVisible();
  });

  test('cancelar agendamento pendente', async ({ page }) => {
    await page.getByRole('link', { name: /agendamentos/i }).click();
    await page.locator('[data-testid="cancel-button"]').first().click();
    await page.getByRole('button', { name: 'Confirmar Cancelamento' }).click();
    await expect(page.getByText(/cancelad/i)).toBeVisible();
  });

});
```

### financial.spec.ts

```typescript
test.describe('Módulo Financeiro', () => {

  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).goto();
    await new LoginPage(page).login('admin@demo.ao', 'Demo1234!');
  });

  test('criar fatura e registar pagamento completo', async ({ page }) => {
    await page.goto('/admin/financeiro/nova');

    // Passo 1: paciente
    await page.getByPlaceholder('Pesquisar paciente').fill('João');
    await page.getByText('João Manuel Silva').first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Passo 2: itens (pré-preenchido)
    await expect(page.getByText('Consulta de Cardiologia')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Passo 3: emitir
    await page.getByRole('button', { name: 'Emitir Fatura' }).click();
    await expect(page.getByText('EMITIDA')).toBeVisible();
    await expect(page.getByText(/F-\d{4}-/)).toBeVisible(); // número de fatura gerado

    // Registar pagamento
    await page.getByRole('button', { name: 'Registar Pagamento' }).click();
    await page.getByLabel('Método').selectOption('DINHEIRO');
    await page.getByLabel('Valor').fill('5000');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('PAGA')).toBeVisible();
  });

});
```

### realtime.spec.ts

```typescript
test.describe('Real-Time WebSocket', () => {

  test('actualização de estado visível sem refresh (< 2s)', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const recepPage  = await ctx1.newPage();
    const medicoPage = await ctx2.newPage();

    await Promise.all([
      new LoginPage(recepPage).login('recepcao@demo.ao', 'Demo1234!').then(() => recepPage.waitForURL(/\/recepcao/)),
      new LoginPage(medicoPage).login('carlos@demo.ao',   'Demo1234!').then(() => medicoPage.waitForURL(/\/medico/)),
    ]);

    // Badge deve estar verde
    await expect(recepPage.getByText('Tempo real')).toBeVisible();

    // Recepcionista confirma agendamento
    const card = recepPage.locator('[data-testid="agendamento-card"]').first();
    await card.getByRole('button', { name: 'Confirmar' }).click();

    // Médico vê actualização em < 2s SEM refresh
    await expect(medicoPage.locator('[data-testid="badge-confirmado"]').first()).toBeVisible({ timeout: 2000 });

    await ctx1.close();
    await ctx2.close();
  });

});
```

---

## 4. k6 — Load Test

```javascript
// k6/load-agendamentos.js
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend } from 'k6/metrics';

const slotLatency = new Trend('slot_latency_ms');

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '2m',  target: 50  },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration:   ['p(95)<500'],
    http_req_failed:     ['rate<0.01'],
    slot_latency_ms:     ['p(95)<300'],
  },
};

export function setup() {
  const res = http.post(`${__ENV.BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'admin@demo.ao', password: 'Demo1234!', clinicaSlug: 'demo' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: res.json('data.accessToken') };
}

export default function ({ token }) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const t0   = Date.now();
  const res  = http.get(`${__ENV.BASE_URL}/api/medicos/MEDICO_ID/slots?data=2026-03-15`, { headers });
  slotLatency.add(Date.now() - t0);

  check(res, { 'slots 200': r => r.status === 200 });
  sleep(Math.random() * 2 + 1);
}
```

---

## 5. CI — Adicionar ao GitHub Actions

```yaml
# .github/workflows/ci.yml — adicionar ao ficheiro existente

  e2e:
    name: E2E Tests (Playwright)
    needs: validate
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec playwright test
        working-directory: apps/web
        env:
          E2E_BASE_URL: ${{ secrets.STAGING_URL }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7

  load-test:
    name: Load Test (k6, semanal)
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: k6/load-agendamentos.js
        env:
          BASE_URL: ${{ secrets.STAGING_API_URL }}
```

---

## 6. Targets de Cobertura v2

| Categoria | v1 Target | v2 Target |
|-----------|-----------|-----------|
| Services (unit) | 80% | 85% |
| Routes (integration) | 70% | 75% |
| Módulo Financeiro (integration) | — | 90% |
| E2E fluxos críticos | — | 4 specs, 8 testes |
| Load test (booking p95) | — | < 500ms |
