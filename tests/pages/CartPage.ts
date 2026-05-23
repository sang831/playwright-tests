import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartIcon: Locator;
  readonly cartItems: Locator;
  readonly cartTotal: Locator;
  readonly cartBadge: Locator;
  readonly emptyCartMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // FIX LỖI 2 (Strict Mode): cartIcon dùng .first() – nhiều aria-label có thể match
    this.cartIcon = page
      .locator('[data-testid="cart-icon"]')
      .or(page.locator('.cart-icon'))
      .or(page.locator('[aria-label*="cart"]'))
      .or(page.locator('[aria-label*="giỏ hàng"]'))
      .first();

    this.cartItems = page.locator('[data-testid="cart-item"], .cart-item');

    // FIX LỖI 2: cartTotal dùng .first() – tránh match cả subtotal lẫn grand-total
    this.cartTotal = page
      .locator('[data-testid="cart-total"]')
      .or(page.locator('.cart-total'))
      .or(page.locator('.total-price'))
      .first();

    // FIX LỖI 2: cartBadge dùng .first()
    this.cartBadge = page
      .locator('[data-testid="cart-badge"]')
      .or(page.locator('.cart-badge'))
      .or(page.locator('.cart-count'))
      .first();

    this.emptyCartMessage = page
      .locator('[data-testid="empty-cart"]')
      .or(page.locator('.empty-cart'))
      .first();
  }

  async goto() {
    await this.page.goto('/cart');
    // FIX LỖI 1 (Timeout): chờ trang cart load xong
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openCart() {
    // FIX LỖI 3 (Bị che khuất): scroll + đảm bảo không bị overlay
    await this.cartIcon.scrollIntoViewIfNeeded();
    await this.cartIcon.click();
    // Chờ cart drawer/modal mở
    await this.page.waitForTimeout(400);
  }

  async getItemCount(): Promise<number> {
    // FIX LỖI 1: badge có thể chưa update ngay, retry vài lần
    await this.cartBadge.waitFor({ state: 'visible', timeout: 5000 });
    const count = await this.cartBadge.innerText();
    return parseInt(count, 10) || 0;
  }

  async getCartTotal(): Promise<number> {
    await this.cartTotal.waitFor({ state: 'visible', timeout: 5000 });
    const totalText = await this.cartTotal.innerText();
    return parseFloat(totalText.replace(/[^0-9.]/g, ''));
  }

  async removeItem(index: number = 0) {
    // FIX LỖI 2: tách selector riêng, ưu tiên data-testid
    const removeButton = this.page
      .locator('[data-testid="remove-item"]')
      .or(this.page.locator('.remove-item'))
      .or(this.page.locator('button[aria-label*="remove"]'))
      .or(this.page.locator('button[aria-label*="xóa"]'))
      .nth(index);

    // FIX LỖI 1: đợi button visible trước khi click
    await removeButton.waitFor({ state: 'visible', timeout: 5000 });

    // FIX LỖI 3 (Bị che khuất): scroll vào vùng nhìn thấy
    await removeButton.scrollIntoViewIfNeeded();
    await removeButton.click();

    // Chờ DOM cập nhật sau khi xóa
    await this.page.waitForLoadState('domcontentloaded');
  }

  async updateQuantity(index: number, action: 'increase' | 'decrease') {
    // FIX LỖI 2: tách selector tránh strict mode violation
    const increaseLocator = this.page
      .locator('[data-testid="increase-qty"]')
      .or(this.page.locator('.increase-qty'))
      .or(this.page.locator('button[aria-label*="increase"]'))
      .or(this.page.locator('button[aria-label*="tăng"]'));

    const decreaseLocator = this.page
      .locator('[data-testid="decrease-qty"]')
      .or(this.page.locator('.decrease-qty'))
      .or(this.page.locator('button[aria-label*="decrease"]'))
      .or(this.page.locator('button[aria-label*="giảm"]'));

    const btn = (action === 'increase' ? increaseLocator : decreaseLocator).nth(index);

    // FIX LỖI 1: chờ button enabled (không bị disabled khi qty = min)
    await btn.waitFor({ state: 'visible', timeout: 5000 });

    // FIX LỖI 3: scroll vào vùng nhìn thấy trước khi click
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    // Chờ giá trị cập nhật
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getQuantityAtIndex(index: number): Promise<number> {
    // FIX LỖI 2: tách selector riêng, ưu tiên data-testid
    const qtyEl = this.page
      .locator('[data-testid="item-quantity"]')
      .or(this.page.locator('.item-quantity'))
      .or(this.page.locator('input[name*="qty"]'))
      .nth(index);

    await qtyEl.waitFor({ state: 'visible', timeout: 5000 });

    // Hỗ trợ cả input và text element
    const tagName = await qtyEl.evaluate(el => el.tagName.toLowerCase());
    const val = tagName === 'input'
      ? await qtyEl.inputValue()
      : await qtyEl.innerText();

    return parseInt(val, 10) || 0;
  }

  async addProductToCart(productSelector: string = '[data-testid="add-to-cart"]') {
    const btn = this.page.locator(productSelector).first();

    // FIX LỖI 1: chờ button xuất hiện
    await btn.waitFor({ state: 'visible', timeout: 8000 });

    // FIX LỖI 3: scroll + click
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }
}
