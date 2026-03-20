import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Autenticação', () => {

  // Uses demo tenant by default if needed, or depends on env E2E_BASE_URL pointing to a specific tenant
  const tenantSlug = 'nutrimacho-ao'; 

  test('login válido → redireciona para dashboard', async ({ page }) => {
    /* eslint-disable no-console */
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', exc => console.log('BROWSER ERROR:', exc.message));
    page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure()?.errorText));
    page.on('request', request => console.log('>>', request.method(), request.url()));
    page.on('response', response => console.log('<<', response.status(), response.url()));
    /* eslint-enable no-console */

    const lp = new LoginPage(page);
    await lp.goto();
    // Assuming contacto.naturamed@gmail.com redirects to /admin/dashboard
    await lp.login('contacto.naturamed@gmail.com', 'Demo1234!', tenantSlug);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  });

  test('login inválido → mensagem de erro em português', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('admin@demo.ao', 'senha-errada', tenantSlug);
    
    // Check for either field-level error or root error
    await expect(lp.fieldError.or(lp.rootError).first()).toBeVisible();
    
    const text = await lp.fieldError.or(lp.rootError).first().textContent();
    // Validate the error is in Portuguese, not English defaults
    expect(text).not.toMatch(/error|invalid|wrong/i);
  });

  test('refresh da página → sessão restaurada sem flash de login', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('contacto.naturamed@gmail.com', 'Demo1234!', tenantSlug);
    await page.waitForURL(/\/admin/);
    
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('token nunca em localStorage', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('contacto.naturamed@gmail.com', 'Demo1234!', tenantSlug);
    
    const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
    expect(stored).not.toContain('token');
    expect(stored).not.toContain('Bearer');
    // Ensure no cp_ prefixed keys that might contain sensitive data
    expect(stored).not.toContain('cp_');
  });

});
