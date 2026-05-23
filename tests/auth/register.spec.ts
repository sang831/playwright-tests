import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { REGISTER_USERS, ERROR_MESSAGES } from '../utils/helpers';

test.describe('Đăng ký', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('TC_REG_01 - Đăng ký thành công với thông tin hợp lệ', async ({ page }) => {
    const uniqueEmail = `testuser_${Date.now()}@example.com`;

    await registerPage.submitForm({
      fullName: REGISTER_USERS.valid.fullName,
      email: uniqueEmail,
      password: REGISTER_USERS.valid.password,
      confirmPassword: REGISTER_USERS.valid.confirmPassword,
    });

    // Sau đăng ký: redirect hoặc thông báo thành công
    await expect(page).toHaveURL(/\/(dashboard|home|login)/);
    // Hoặc kiểm tra success message
    const hasSuccess = await registerPage.hasSuccessMessage();
    expect(hasSuccess || !page.url().includes('/register')).toBeTruthy();
  });

  test('TC_REG_02 - Email đã tồn tại hiển thị lỗi', async () => {
    await registerPage.submitForm({
      fullName: 'Duplicate User',
      email: 'test@example.com', // email đã tồn tại
      password: REGISTER_USERS.valid.password,
      confirmPassword: REGISTER_USERS.valid.confirmPassword,
    });

    const error = await registerPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.emailExists);
  });

  test('TC_REG_03 - Mật khẩu xác nhận không khớp', async () => {
    const uniqueEmail = `user_${Date.now()}@example.com`;

    await registerPage.submitForm({
      fullName: REGISTER_USERS.mismatchPassword.fullName,
      email: uniqueEmail,
      password: REGISTER_USERS.mismatchPassword.password,
      confirmPassword: REGISTER_USERS.mismatchPassword.confirmPassword,
    });

    const error = await registerPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.passwordMismatch);
  });

  test('TC_REG_04 - Bỏ trống tất cả fields', async () => {
    await registerPage.submit();

    const errorCount = await registerPage.getFieldErrorCount();
    expect(errorCount).toBeGreaterThanOrEqual(3); // ít nhất name, email, password có lỗi
  });

  test('TC_REG_05 - Mật khẩu quá ngắn (dưới 8 ký tự)', async () => {
    const uniqueEmail = `user_${Date.now()}@example.com`;

    await registerPage.submitForm({
      fullName: 'Test User',
      email: uniqueEmail,
      password: '123',
      confirmPassword: '123',
    });

    const error = await registerPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.passwordTooShort);
  });

  test('TC_REG_06 - Email không hợp lệ', async () => {
    await registerPage.submitForm({
      fullName: 'Test User',
      email: 'notanemail',
      password: REGISTER_USERS.valid.password,
      confirmPassword: REGISTER_USERS.valid.confirmPassword,
    });

    const error = await registerPage.getErrorMessage();
    expect(error).toMatch(ERROR_MESSAGES.invalidEmail);
  });
});
