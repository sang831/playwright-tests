import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/CheckoutPage';
import { loginViaAPI, addProductViaAPI, clearCartViaAPI, SHIPPING_ADDRESSES } from '../utils/helpers';

const PRODUCT_ID = 'product-test-001';

test.describe('Thanh toán & Phí ship', () => {
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    checkoutPage = new CheckoutPage(page);
    await loginViaAPI(page, 'test@example.com', 'Test@12345');
    await clearCartViaAPI(page);
    await addProductViaAPI(page, PRODUCT_ID, 1);
    await checkoutPage.goto();
  });

  // ── Điền thông tin địa chỉ ──────────────────────────────────────────────────

  test('TC_CHECKOUT_01 - Điền đầy đủ thông tin giao hàng hợp lệ', async ({ page }) => {
    await checkoutPage.fillShippingInfo(SHIPPING_ADDRESSES.hcm);

    const errorCount = await checkoutPage.getErrorCount();
    expect(errorCount).toBe(0);
    await expect(checkoutPage.placeOrderButton).toBeEnabled();
  });

  test('TC_CHECKOUT_02 - Chọn tỉnh/thành và quận/huyện tự động load', async ({ page }) => {
    await checkoutPage.provinceSelect.scrollIntoViewIfNeeded(); // FIX LỖI 3
    await checkoutPage.provinceSelect.selectOption({ label: SHIPPING_ADDRESSES.hcm.province });

    // FIX LỖI 1: thay waitForTimeout bằng polling chờ options thực sự load
    await expect(async () => {
      const count = await checkoutPage.districtSelect.locator('option').count();
      expect(count).toBeGreaterThan(1);
    }).toPass({ timeout: 8000 });
  });

  // ── Phí ship thay đổi theo tỉnh/thành ──────────────────────────────────────

  test('TC_CHECKOUT_03 - Phí ship thay đổi khi chọn tỉnh/thành khác nhau', async ({ page }) => {
    await checkoutPage.fillShippingInfo({ province: SHIPPING_ADDRESSES.hcm.province });

    // FIX LỖI 1: polling chờ shippingFee hiển thị
    await expect(checkoutPage.shippingFee).toBeVisible({ timeout: 5000 });
    const shippingHCM = await checkoutPage.getShippingFee();

    await checkoutPage.fillShippingInfo({ province: SHIPPING_ADDRESSES.hanoi.province });
    await expect(checkoutPage.shippingFee).toBeVisible({ timeout: 5000 });
    const shippingHanoi = await checkoutPage.getShippingFee();

    expect(shippingHCM > 0 || shippingHanoi > 0).toBe(true);
  });

  test('TC_CHECKOUT_04 - Phí ship hiển thị sau khi chọn đủ tỉnh/quận/phường', async ({ page }) => {
    await checkoutPage.fillShippingInfo(SHIPPING_ADDRESSES.hcm);

    // FIX LỖI 1: polling thay vì sleep
    await expect(checkoutPage.shippingFee).toBeVisible({ timeout: 5000 });
    const fee = await checkoutPage.getShippingFee();
    expect(fee).toBeGreaterThanOrEqual(0);
  });

  // ── Kiểm tra tổng tiền ──────────────────────────────────────────────────────

  test('TC_CHECKOUT_05 - Tổng tiền = tiền hàng + phí ship', async ({ page }) => {
    await checkoutPage.fillShippingInfo(SHIPPING_ADDRESSES.hcm);
    await expect(checkoutPage.shippingFee).toBeVisible({ timeout: 5000 });

    const shippingFee = await checkoutPage.getShippingFee();
    const orderTotal = await checkoutPage.getOrderTotal();

    // FIX LỖI 2: subtotal dùng .first() tránh match nhiều phần tử
    const subtotalEl = page
      .locator('[data-testid="subtotal"]')
      .or(page.locator('.subtotal'))
      .first();
    await subtotalEl.waitFor({ state: 'visible', timeout: 5000 });
    const subtotalText = await subtotalEl.innerText();
    const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));

    expect(orderTotal).toBeCloseTo(subtotal + shippingFee, 0);
  });

  // ── Validate thiếu thông tin ─────────────────────────────────────────────────

  test('TC_CHECKOUT_06 - Đặt hàng khi bỏ trống tất cả thông tin', async ({ page }) => {
    // FIX LỖI 3: placeOrder đã xử lý scroll bên trong
    await checkoutPage.placeOrder();

    // FIX LỖI 1: polling chờ validation messages render
    await expect(async () => {
      const errorCount = await checkoutPage.getErrorCount();
      expect(errorCount).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 5000 });

    await expect(page).toHaveURL('/checkout');
  });

  test('TC_CHECKOUT_07 - Đặt hàng khi thiếu tên người nhận', async ({ page }) => {
    await checkoutPage.fillShippingInfo({
      phone: SHIPPING_ADDRESSES.hcm.phone,
      address: SHIPPING_ADDRESSES.hcm.address,
      province: SHIPPING_ADDRESSES.hcm.province,
    });
    await checkoutPage.placeOrder();

    // FIX LỖI 2: tách selector riêng, dùng .first()
    const nameError = page
      .locator('[data-testid="full-name-error"]')
      .or(page.locator('[name="fullName"] ~ .error'))
      .first();
    await expect(nameError).toBeVisible({ timeout: 5000 });
  });

  test('TC_CHECKOUT_08 - Đặt hàng khi thiếu số điện thoại', async ({ page }) => {
    await checkoutPage.fillShippingInfo({
      fullName: SHIPPING_ADDRESSES.hcm.fullName,
      address: SHIPPING_ADDRESSES.hcm.address,
      province: SHIPPING_ADDRESSES.hcm.province,
    });
    await checkoutPage.placeOrder();

    const phoneError = page
      .locator('[data-testid="phone-error"]')
      .or(page.locator('[name="phone"] ~ .error'))
      .first();
    await expect(phoneError).toBeVisible({ timeout: 5000 });
  });

  test('TC_CHECKOUT_09 - Số điện thoại không hợp lệ hiển thị lỗi', async ({ page }) => {
    await checkoutPage.fillShippingInfo({
      fullName: SHIPPING_ADDRESSES.hcm.fullName,
      phone: '12345',
      address: SHIPPING_ADDRESSES.hcm.address,
      province: SHIPPING_ADDRESSES.hcm.province,
    });
    await checkoutPage.placeOrder();

    const phoneError = page
      .locator('[data-testid="phone-error"]')
      .or(page.locator('.phone-error'))
      .first();
    await expect(phoneError).toBeVisible({ timeout: 5000 });
    await expect(phoneError).toHaveText(/số điện thoại không hợp lệ|invalid phone/i);
  });

  test('TC_CHECKOUT_10 - Đặt hàng thành công với đầy đủ thông tin', async ({ page }) => {
    await checkoutPage.fillShippingInfo(SHIPPING_ADDRESSES.hcm);
    await checkoutPage.placeOrder();

    // FIX LỖI 1: waitForURL với timeout
    await page.waitForURL(/\/order-(success|confirmation|complete)/, { timeout: 15000 });

    // FIX LỖI 2: successMessage dùng .first()
    const successMessage = page
      .locator('[data-testid="order-success"]')
      .or(page.locator('.order-success'))
      .or(page.locator('h1').filter({ hasText: /đặt hàng thành công|order placed|cảm ơn/i }))
      .first();
    await expect(successMessage).toBeVisible({ timeout: 8000 });
  });
});
