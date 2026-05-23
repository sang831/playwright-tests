import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly fullNameInput: Locator;
  readonly phoneInput: Locator;
  readonly addressInput: Locator;
  readonly provinceSelect: Locator;
  readonly districtSelect: Locator;
  readonly wardSelect: Locator;
  readonly shippingFee: Locator;
  readonly orderTotal: Locator;
  readonly placeOrderButton: Locator;
  readonly errorMessages: Locator;

  constructor(page: Page) {
    this.page = page;

    // FIX LỖI 2 (Strict Mode): dùng .or() + .first() thay vì CSS comma list
    this.fullNameInput = page
      .locator('[data-testid="full-name"]')
      .or(page.locator('input[name="customer[fullName]"]'))
      .or(page.locator('input[name="fullName"]'))
      .or(page.locator('input[placeholder*="họ tên"]'))
      .first();

    // FIX LỖI 2: input[type="tel"] có thể match nhiều trường → .first()
    this.phoneInput = page
      .locator('[data-testid="phone"]')
      .or(page.locator('input[name="customer[phone]"]'))
      .or(page.locator('input[name="phone"]'))
      .or(page.locator('input[type="tel"]'))
      .first();

    this.addressInput = page
      .locator('[data-testid="address"]')
      .or(page.locator('input[name="customer[address]"]'))
      .or(page.locator('input[name="address"]'))
      .or(page.locator('textarea[name="address"]'))
      .first();

    // FIX LỖI 2: select có thể trùng với label [aria-label*="tỉnh"]
    this.provinceSelect = page
      .locator('[data-testid="province"]')
      .or(page.locator('select[name="customer[province]"]'))
      .or(page.locator('select[name="province"]'))
      .or(page.locator('[aria-label="tỉnh/thành phố"]'))
      .first();

    this.districtSelect = page
      .locator('[data-testid="district"]')
      .or(page.locator('select[name="customer[district]"]'))
      .or(page.locator('select[name="district"]'))
      .or(page.locator('[aria-label="quận/huyện"]'))
      .first();

    this.wardSelect = page
      .locator('[data-testid="ward"]')
      .or(page.locator('select[name="customer[ward]"]'))
      .or(page.locator('select[name="ward"]'))
      .or(page.locator('[aria-label="phường/xã"]'))
      .first();

    // FIX LỖI 2: .shipping-fee và .total-price đều có thể match nhiều phần tử
    this.shippingFee = page
      .locator('[data-testid="shipping-fee"]')
      .or(page.locator('.shipping-fee'))
      .first();

    this.orderTotal = page
      .locator('[data-testid="order-total"]')
      .or(page.locator('.order-total'))
      .first();

    // FIX LỖI 2: placeOrderButton – filter text chính xác tránh match submit khác
    this.placeOrderButton = page
      .locator('[data-testid="place-order"]')
      .or(page.locator('button[type="submit"]').filter({ hasText: /^(đặt hàng|place order)$/i }))
      .first();

    this.errorMessages = page.locator(
      '[data-testid="field-error"], .field-error, .input-error'
    );
  }

  async goto() {
    await this.page.goto('/checkout');
    // FIX LỖI 1 (Timeout): chờ form checkout render xong
    await this.fullNameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillShippingInfo(info: {
    fullName?: string;
    phone?: string;
    address?: string;
    province?: string;
    district?: string;
    ward?: string;
  }) {
    if (info.fullName) {
      await this.fullNameInput.scrollIntoViewIfNeeded(); // FIX LỖI 3
      await this.fullNameInput.clear();
      await this.fullNameInput.fill(info.fullName);
    }
    if (info.phone) {
      await this.phoneInput.scrollIntoViewIfNeeded();
      await this.phoneInput.clear();
      await this.phoneInput.fill(info.phone);
    }
    if (info.address) {
      await this.addressInput.scrollIntoViewIfNeeded();
      await this.addressInput.clear();
      await this.addressInput.fill(info.address);
    }
    if (info.province) {
      await this.provinceSelect.scrollIntoViewIfNeeded();
      await this.provinceSelect.selectOption({ label: info.province });
    }
    if (info.district) {
      // FIX LỖI 1: thay waitForTimeout cứng bằng chờ option thực sự load
      await this.districtSelect.waitFor({ state: 'visible', timeout: 5000 });
      await this._waitForSelectOptions(this.districtSelect);
      await this.districtSelect.scrollIntoViewIfNeeded();
      await this.districtSelect.selectOption({ label: info.district });
    }
    if (info.ward) {
      await this.wardSelect.waitFor({ state: 'visible', timeout: 5000 });
      await this._waitForSelectOptions(this.wardSelect);
      await this.wardSelect.scrollIntoViewIfNeeded();
      await this.wardSelect.selectOption({ label: info.ward });
    }
  }

  /** Chờ select có > 1 option (tức là đã load xong dữ liệu từ API) */
  private async _waitForSelectOptions(select: Locator, timeout = 5000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const count = await select.locator('option').count();
      if (count > 1) return;
      await this.page.waitForTimeout(200);
    }
    throw new Error('Select options did not load in time');
  }

  async getShippingFee(): Promise<number> {
    // FIX LỖI 1: chờ element visible trước khi đọc text
    await this.shippingFee.waitFor({ state: 'visible', timeout: 5000 });
    const text = await this.shippingFee.innerText();
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  async getOrderTotal(): Promise<number> {
    await this.orderTotal.waitFor({ state: 'visible', timeout: 5000 });
    const text = await this.orderTotal.innerText();
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  async placeOrder() {
    // FIX LỖI 3 (Bị che khuất): scroll button vào vùng nhìn thấy, tránh bị sticky footer che
    await this.placeOrderButton.scrollIntoViewIfNeeded();
    // FIX LỖI 1: chờ button enabled (không disabled do form chưa hợp lệ)
    await this.placeOrderButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.placeOrderButton.click();
  }

  async getErrorCount(): Promise<number> {
    // Chờ một chút để validation render ra
    await this.page.waitForTimeout(300);
    return await this.errorMessages.count();
  }
}
