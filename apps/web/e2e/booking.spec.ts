import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Marcação de Consulta (Paciente)', () => {

  const tenantSlug = 'nutrimacho-ao';

  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).goto();
    await new LoginPage(page).login('joao@demo.ao', 'Demo1234!', tenantSlug);
    await page.waitForURL(/\/paciente/);
  });

  test.skip('criar marcação end-to-end', async ({ page }) => {
    // TODO: The actual UI flow needs to be confirmed. 
    // The "Marcar Consulta" wizard selectors might differ in the current implementation.
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

  test.skip('cancelar agendamento pendente', async ({ page }) => {
    // TODO: Implement according to actual Paciente Dashboard UI
    await page.getByRole('link', { name: /agendamentos/i }).click();
    await page.locator('[data-testid="cancel-button"]').first().click();
    await page.getByRole('button', { name: 'Confirmar Cancelamento' }).click();
    await expect(page.getByText(/cancelad/i)).toBeVisible();
  });

});
