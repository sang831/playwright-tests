import { Page, Locator, expect } from '@playwright/test';

interface RegisterFormData {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export class RegisterPage {
  readonly page: Page;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly fieldErrors: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.fullNameInput = page
      .locator('[data-testid="full-name"]')
      .or(page.locator('input[name="customer[fullName]"]'))
      .or(page.locator('input[name="fullName"]'))
      .first();

    this.emailInput = page
      .locator('[data-testid="email"]')
      .or(page.locator('input[name="customer[email]"]'))
      .or(page.locator('input[name="email"]'))
      .first();

    this.passwordInput = page
      .locator('[data-testid="password"]')
      .or(page.locator('input[name="customer[password]"]'))
      .or(page.locator('input[name="password"]'))
      .first();

    this.confirmPasswordInput = page
      .locator('[data-testid="confirm-password"]')
      .or(page.locator('input[name="customer[confirmPassword]"]'))
      .or(page.locator('input[name="confirmPassword"]'))
      .first();

    this.submitButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: /đăng ký|register|sign up/i })
      .first();

    this.errorMessage = page
      .locator('[data-testid="error-message"]')
      .or(page.locator('.alert-error'))
      .or(page.locator('[role="alert"]'))
      .first();

    this.fieldErrors = page.locator('[data-testid="field-error"], .field-error, [data-testid="confirm-password-error"]');

    this.successMessage = page
      .locator('[data-testid="success-message"]')
      .or(page.locator('.alert-success'))
      .first();
  }

  async goto() {
    await this.page.goto('/register');
    await this.fullNameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillForm(data: RegisterFormData) {
    if (data.fullName !== undefined) {
      await this.fullNameInput.clear();
      await this.fullNameInput.fill(data.fullName);
    }

    if (data.email !== undefined) {
      await this.emailInput.clear();
      await this.emailInput.fill(data.email);
    }

    if (data.password !== undefined) {
      await this.passwordInput.clear();
      await this.passwordInput.fill(data.password);
    }

    if (data.confirmPassword !== undefined) {
      await this.confirmPasswordInput.clear();
      await this.confirmPasswordInput.fill(data.confirmPassword);
    }
  }

  async submit() {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
  }

  async submitForm(data: RegisterFormData) {
    await this.fillForm(data);
    await this.submit();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 8000 });
    return await this.errorMessage.innerText();
  }

  async getFieldErrorCount(): Promise<number> {
    return await this.fieldErrors.count();
  }

  async hasSuccessMessage(): Promise<boolean> {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
