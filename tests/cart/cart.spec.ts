import { test, expect } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { loginViaAPI, addProductViaAPI, clearCartViaAPI } from '../utils/helpers';

const PRODUCT_ID = 'product-test-001';

test.describe('Giỏ hàng', () => {
  let cartPage: CartPage;

  test.beforeEach(async ({ page }) => {
    cartPage = new CartPage(page);
    await loginViaAPI(page, 'test@example.com', 'Test@12345');
    await clearCartViaAPI(page);
    await cartPage.goto();
  });

  // ── Thêm sản phẩm ───────────────────────────────────────────────────────────

  test('TC_CART_01 - Thêm sản phẩm vào giỏ hàng', async ({ page }) => {
    await page.goto('/products');
    // FIX LỖI 1: dùng waitFor thay vì waitForSelector (Playwright native)
    await page.locator('[data-testid="add-to-cart"]').first().waitFor({ state: 'visible', timeout: 8000 });

    // FIX LỖI 2: .first() tránh strict mode khi có nhiều nút add-to-cart
    await cartPage.addProductToCart();

    await cartPage.goto();
    const count = await cartPage.cartItems.count();
    expect(count).toBe(1);
  });

  test('TC_CART_02 - Số lượng badge giỏ hàng cập nhật sau khi thêm', async ({ page }) => {
    await page.goto('/products');
    await page.locator('[data-testid="add-to-cart"]').first().waitFor({ state: 'visible', timeout: 8000 });

    const before = await cartPage.getItemCount().catch(() => 0);

    // FIX LỖI 3 (Bị che khuất): addProductToCart đã xử lý scroll bên trong
    await cartPage.addProductToCart();

    // FIX LỖI 1: dùng expect polling thay vì check ngay lập tức
    await expect(cartPage.cartBadge).toContainText(String(before + 1), { timeout: 5000 });
  });

  // ── Xóa sản phẩm ────────────────────────────────────────────────────────────

  test('TC_CART_03 - Xóa sản phẩm khỏi giỏ hàng', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 1);
    await cartPage.goto();

    const beforeCount = await cartPage.cartItems.count();
    expect(beforeCount).toBeGreaterThan(0);

    // FIX LỖI 3: removeItem đã xử lý scrollIntoViewIfNeeded bên trong
    await cartPage.removeItem(0);

    // FIX LỖI 1: dùng expect polling thay vì waitForTimeout cứng
    await expect(cartPage.cartItems).toHaveCount(beforeCount - 1, { timeout: 5000 });
  });

  test('TC_CART_04 - Xóa hết sản phẩm hiển thị giỏ hàng trống', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 1);
    await cartPage.goto();

    await cartPage.removeItem(0);

    // FIX LỖI 1: expect polling với timeout thay vì waitForTimeout
    await expect(cartPage.emptyCartMessage).toBeVisible({ timeout: 5000 });
  });

  // ── Tăng / giảm số lượng ────────────────────────────────────────────────────

  test('TC_CART_05 - Tăng số lượng sản phẩm', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 1);
    await cartPage.goto();

    const before = await cartPage.getQuantityAtIndex(0);

    // FIX LỖI 3: updateQuantity đã xử lý scroll bên trong
    await cartPage.updateQuantity(0, 'increase');

    // FIX LỖI 1: polling thay vì sleep
    await expect(async () => {
      const after = await cartPage.getQuantityAtIndex(0);
      expect(after).toBe(before + 1);
    }).toPass({ timeout: 5000 });
  });

  test('TC_CART_06 - Giảm số lượng sản phẩm', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 2);
    await cartPage.goto();

    const before = await cartPage.getQuantityAtIndex(0);
    expect(before).toBe(2);

    await cartPage.updateQuantity(0, 'decrease');

    await expect(async () => {
      const after = await cartPage.getQuantityAtIndex(0);
      expect(after).toBe(1);
    }).toPass({ timeout: 5000 });
  });

  test('TC_CART_07 - Giảm số lượng về 0 tự động xóa sản phẩm', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 1);
    await cartPage.goto();

    await cartPage.updateQuantity(0, 'decrease');

    // FIX LỖI 1: polling
    await expect(cartPage.cartItems).toHaveCount(0, { timeout: 5000 });
  });

  // ── Tổng tiền ───────────────────────────────────────────────────────────────

  test('TC_CART_08 - Tổng tiền thay đổi đúng khi tăng số lượng', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 1);
    await cartPage.goto();

    const totalBefore = await cartPage.getCartTotal();
    await cartPage.updateQuantity(0, 'increase');

    // FIX LỖI 1: polling cho total update
    await expect(async () => {
      const totalAfter = await cartPage.getCartTotal();
      expect(totalAfter).toBeGreaterThan(totalBefore);
      expect(totalAfter).toBeCloseTo(totalBefore * 2, 0);
    }).toPass({ timeout: 5000 });
  });

  test('TC_CART_09 - Tổng tiền thay đổi đúng khi giảm số lượng', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 2);
    await cartPage.goto();

    const totalBefore = await cartPage.getCartTotal();
    await cartPage.updateQuantity(0, 'decrease');

    await expect(async () => {
      const totalAfter = await cartPage.getCartTotal();
      expect(totalAfter).toBeLessThan(totalBefore);
    }).toPass({ timeout: 5000 });
  });

  test('TC_CART_10 - Tổng tiền giảm sau khi xóa sản phẩm', async ({ page }) => {
    await addProductViaAPI(page, PRODUCT_ID, 1);
    await addProductViaAPI(page, 'product-test-002', 1);
    await cartPage.goto();

    const totalBefore = await cartPage.getCartTotal();
    await cartPage.removeItem(0);

    await expect(async () => {
      const totalAfter = await cartPage.getCartTotal();
      expect(totalAfter).toBeLessThan(totalBefore);
    }).toPass({ timeout: 5000 });
  });
});
