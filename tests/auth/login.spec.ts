import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS, INVALID_EMAILS, ERROR_MESSAGES } from '../utils/helpers';

test.describe('Đăng nhập', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  test('TC_LOGIN_01 - Đăng nhập thành công với tài khoản hợp lệ', async ({ page }) => {
    await loginPage.login(TEST_USERS.valid.email, TEST_USERS.valid.password);

    // FIX LỖI 1: dùng waitForURL thay vì expect URL ngay lập tức
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    await expect(page).toHaveURL(/\/(home|dashboard|$)/);
    expect(await loginPage.isLoggedIn()).toBe(true);
  });

  test('TC_LOGIN_02 - Đăng xuất thành công', async ({ page }) => {
    await loginPage.login(TEST_USERS.valid.email, TEST_USERS.valid.password);
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });

    await loginPage.logout();

    // FIX LỖI 1: chờ redirect sau logout hoàn tất
    await page.waitForURL(/\/(login|$)/, { timeout: 8000 });
    expect(await loginPage.isLoggedIn()).toBe(false);
  });

  test('TC_LOGIN_03 - Session còn lưu sau khi reload trang', async ({ page }) => {
    await loginPage.login(TEST_USERS.valid.email, TEST_USERS.valid.password);
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(await loginPage.isLoggedIn()).toBe(true);
  });

  // ── Sad path ────────────────────────────────────────────────────────────────

  test('TC_LOGIN_04 - Sai mật khẩu hiển thị thông báo lỗi', async ({ page }) => {
    await loginPage.login(TEST_USERS.invalidPassword.email, TEST_USERS.invalidPassword.password);

    // FIX LỖI 1: getErrorMessage đã có waitFor bên trong
    const error = await loginPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.invalidPassword);
    await expect(page).toHaveURL('/login');
  });

  test('TC_LOGIN_05 - Email không tồn tại hiển thị thông báo lỗi', async ({ page }) => {
    await loginPage.login(TEST_USERS.nonExistent.email, TEST_USERS.nonExistent.password);

    const error = await loginPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.userNotFound);
  });

  test('TC_LOGIN_06 - Bỏ trống email và mật khẩu', async ({ page }) => {
    // FIX LỖI 3 (Bị che khuất): scroll button vào view trước khi click
    await loginPage.loginButton.scrollIntoViewIfNeeded();
    await loginPage.loginButton.click();

    // FIX LỖI 1: chờ validation render
    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true', { timeout: 5000 });
    await expect(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'true', { timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('TC_LOGIN_07 - Bỏ trống chỉ email', async ({ page }) => {
    await loginPage.passwordInput.fill(TEST_USERS.valid.password);
    await loginPage.loginButton.scrollIntoViewIfNeeded();
    await loginPage.loginButton.click();

    const error = await loginPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.emailRequired);
  });

  test('TC_LOGIN_08 - Bỏ trống chỉ mật khẩu', async ({ page }) => {
    await loginPage.emailInput.fill(TEST_USERS.valid.email);
    await loginPage.loginButton.scrollIntoViewIfNeeded();
    await loginPage.loginButton.click();

    const error = await loginPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.passwordRequired);
  });

  for (const invalidEmail of INVALID_EMAILS.filter(e => e !== '')) {
    test(`TC_LOGIN_09 - Email không hợp lệ: "${invalidEmail}"`, async ({ page }) => {
      await loginPage.login(invalidEmail, TEST_USERS.valid.password);

      const error = await loginPage.getErrorMessage();
      expect(error).toMatch(ERROR_MESSAGES.invalidEmail);
    });
  }
});
