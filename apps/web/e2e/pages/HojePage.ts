import { type Page } from '@playwright/test';

export class HojePage {
  constructor(private page: Page) {}

  get realtimeBadge() { return this.page.getByText('Tempo real'); }
  get agendamentoCards() { return this.page.locator('[data-testid="agendamento-card"]'); }
  get loadingIndicator() { return this.page.getByTestId('loading'); }
}
