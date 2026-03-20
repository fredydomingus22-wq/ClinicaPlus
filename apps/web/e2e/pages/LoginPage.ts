import { type Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() { 
    await this.page.goto('/login'); 
  }

  async login(email: string, password: string, clinicaSlug?: string) {
    if (clinicaSlug) {
      const slugInput = this.page.getByPlaceholder('slug-da-clinica');
      if (await slugInput.isVisible()) {
        await slugInput.fill(clinicaSlug);
      }
    }
    
    // As per actual UI: E-mail and Palavra-passe
    await this.page.getByLabel('E-mail').fill(email);
    await this.page.getByLabel('Palavra-passe').fill(password);
    
    // As per actual UI: Entrar na Plataforma
    await this.page.getByRole('button', { name: 'Entrar na Plataforma' }).click();
  }

  // Locators for field-level inline errors and root errors
  get fieldError() { return this.page.locator('p.text-red-500'); }
  get rootError() { return this.page.locator('div.text-red-700'); }
}
