import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { FaturaPage } from './pages/FaturaPage';

test.describe('Módulo Financeiro', () => {

  const tenantSlug = 'nutrimacho-ao';

  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).goto();
    await new LoginPage(page).login('admin@demo.ao', 'Demo1234!', tenantSlug);
  });

  test.skip('criar fatura e registar pagamento completo', async ({ page }) => {
    // TODO: Verify if the current UI has the multi-step wizard to create an invoice.
    // The actual flow might require selecting an existing appointment first.
    const fp = new FaturaPage(page);
    await fp.gotoNovaFatura();

    // Passo 1: paciente
    await page.getByPlaceholder('Pesquisar paciente').fill('João');
    await page.getByText('João Manuel Silva').first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Passo 2: itens (pré-preenchido)
    await expect(page.getByText('Consulta de Cardiologia')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Passo 3: emitir
    await fp.emitirFatura();
    await expect(page.getByText('EMITIDA')).toBeVisible();
    await expect(page.getByText(/F-\d{4}-/)).toBeVisible(); // número de fatura gerado

    // Registar pagamento
    await fp.registarPagamento('DINHEIRO', '5000');
    await expect(page.getByText('PAGA')).toBeVisible();
  });

});
