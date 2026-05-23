import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly logoutButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // FIX LỖI 2 (Strict Mode): Dùng .first() hoặc selector cụ thể nhất trước,
    // tránh CSS list selector resolve ra nhiều element cùng lúc.
    // Ưu tiên data-testid → fallback từng selector riêng lẻ qua .or()
    this.emailInput = page
      .locator('[data-testid="email-input"]')
      .or(page.locator('input[name="customer[email]"]'))
      .or(page.locator('input[name="email"]'))
      .or(page.locator('input[type="email"]'))
      .first();

    this.passwordInput = page
      .locator('[data-testid="password-input"]')
      .or(page.locator('input[name="customer[password]"]'))
      .or(page.locator('input[name="password"]'))
      .or(page.locator('input[type="password"]'))
      .first();

    // FIX LỖI 2: loginButton dùng filter hasText để không match nhiều button
    this.loginButton = page
      .locator('[data-testid="login-button"]')
      .or(page.locator('button[type="submit"]').filter({ hasText: /^(đăng nhập|login|sign in)$/i }))
      .first();

    // FIX LỖI 2: errorMessage dùng .first() – nhiều [role="alert"] có thể tồn tại
    this.errorMessage = page
      .locator('[data-testid="error-message"]')
      .or(page.locator('.error-message'))
      .or(page.locator('.alert-error'))
      .or(page.locator('[role="alert"]'))
      .first();

    // FIX LỖI 2 + LỖI 3: logoutButton có thể bị ẩn sau dropdown/menu,
    // dùng filter hasText chính xác, tránh match button khác
    this.logoutButton = page
      .locator('[data-testid="logout-button"]')
      .or(page.locator('button').filter({ hasText: /^(đăng xuất|logout|sign out)$/i }))
      .first();

    this.forgotPasswordLink = page
      .locator('a')
      .filter({ hasText: /quên mật khẩu|forgot password/i })
      .first();
  }

  async goto() {
    await this.page.goto('/login');
    // FIX LỖI 1 (Timeout): chờ form thực sự visible trước khi test thao tác
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async login(email: string, password: string) {
    // FIX LỖI 1: clear trước fill để tránh giá trị cũ gây lỗi
    await this.emailInput.clear();
    await this.emailInput.fill(email);
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);

    // FIX LỖI 3 (Element bị che khuất): scrollIntoViewIfNeeded + force nếu bị overlay
    await this.loginButton.scrollIntoViewIfNeeded();
    await this.loginButton.click();
  }

  async logout() {
    // FIX LỖI 3: element logout có thể nằm trong dropdown, cần mở menu trước
    const userMenu = this.page.locator('[data-testid="user-menu"], .user-menu, .avatar-btn').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      // Chờ dropdown animate xong
      await this.page.waitForTimeout(300);
    }
    await this.logoutButton.scrollIntoViewIfNeeded();
    await this.logoutButton.click();
  }

  async getErrorMessage(): Promise<string> {
    // FIX LỖI 1: timeout rõ ràng thay vì dùng default 30s mà không biết
    await this.errorMessage.waitFor({ state: 'visible', timeout: 8000 });
    return await this.errorMessage.innerText();
  }

  async isLoggedIn(): Promise<boolean> {
    // FIX LỖI 1: không throw nếu không tìm thấy, trả về false luôn
    try {
      await this.logoutButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
