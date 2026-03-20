import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Real-Time WebSocket', () => {

  const tenantSlug = 'nutrimacho-ao';

  test.skip('actualização de estado visível sem refresh (< 2s)', async ({ browser }) => {
    // TODO: This requires a fully functional WebSocket server running and
    // specific seeded data for an appointment on the current day.
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const recepPage  = await ctx1.newPage();
    const medicoPage = await ctx2.newPage();

    await Promise.all([
      new LoginPage(recepPage).login('recepcaodemo.ao', 'Demo1234!', tenantSlug).then(() => recepPage.waitForURL(/\/recepcao/)),
      new LoginPage(medicoPage).login('carlos@demo.ao',   'Demo1234!', tenantSlug).then(() => medicoPage.waitForURL(/\/medico/)),
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
