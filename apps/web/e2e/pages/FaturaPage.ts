import { type Page } from '@playwright/test';

export class FaturaPage {
  constructor(private page: Page) {}

  async gotoNovaFatura() { await this.page.goto('/admin/financeiro/nova'); }

  async emitirFatura() {
    await this.page.getByRole('button', { name: 'Emitir Fatura' }).click();
  }

  async registarPagamento(metodo: string, valor: string) {
    await this.page.getByRole('button', { name: 'Registar Pagamento' }).click();
    await this.page.getByLabel('Método').selectOption(metodo);
    await this.page.getByLabel('Valor').fill(valor);
    await this.page.getByRole('button', { name: 'Confirmar' }).click();
  }
}
