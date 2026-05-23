import { Page, Locator } from '@playwright/test';

export class SearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly productItems: Locator;
  readonly noResultMessage: Locator;
  readonly filterSection: Locator;

  constructor(page: Page) {
    this.page = page;

    // FIX LỖI 2 (Strict Mode): tách .or() thay vì CSS comma list
    // CSS comma selector như "a, b, c" resolve tất cả cùng lúc → strict violation
    this.searchInput = page
      .locator('[data-testid="search-input"]')
      .or(page.locator('input[name="search"]'))
      .or(page.locator('input[placeholder*="tìm"]'))
      .or(page.locator('input[placeholder*="search"]'))
      .first();

    // FIX LỖI 2: searchButton dùng .first() đề phòng có nhiều button submit
    this.searchButton = page
      .locator('[data-testid="search-button"]')
      .or(page.locator('button[type="submit"][aria-label*="search"]'))
      .or(page.locator('button').filter({ hasText: /^tìm$|^search$/i }))
      .first();

    this.productItems = page.locator('[data-testid="product-item"], .product-item, .product-card');

    this.noResultMessage = page
      .locator('[data-testid="no-result"]')
      .or(page.locator('.no-result'))
      .or(page.locator('.empty-result'))
      .first();

    this.filterSection = page
      .locator('[data-testid="filter-section"]')
      .or(page.locator('.filter-section'))
      .or(page.locator('aside.filters'))
      .first();
  }

  async goto() {
    await this.page.goto('/search');
    // FIX LỖI 1 (Timeout): chờ search input sẵn sàng
    await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async search(keyword: string) {
    await this.searchInput.clear();
    await this.searchInput.fill(keyword);

    // FIX LỖI 3 (Bị che khuất): scroll button vào view trước khi click
    await this.searchButton.scrollIntoViewIfNeeded();
    await this.searchButton.click();

    // FIX LỖI 1: chờ kết quả load, có timeout hợp lý
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async getProductCount(): Promise<number> {
    // FIX LỖI 1: không waitFor ở đây – trả về 0 nếu không có
    return await this.productItems.count();
  }

  async applyFilter(type: 'size' | 'price' | 'brand' | 'color', value: string) {
    const filterMap: Record<string, Locator> = {
      size: this.page.locator('[data-testid="filter-size"]').or(this.page.locator('.filter-size')),
      price: this.page.locator('[data-testid="filter-price"]').or(this.page.locator('.filter-price')),
      brand: this.page.locator('[data-testid="filter-brand"]').or(this.page.locator('.filter-brand')),
      color: this.page.locator('[data-testid="filter-color"]').or(this.page.locator('.filter-color')),
    };

    // FIX LỖI 2: filter hasText thu hẹp chính xác 1 element
    const filterLocator = filterMap[type].filter({ hasText: value }).first();

    // FIX LỖI 1: chờ filter item visible
    await filterLocator.waitFor({ state: 'visible', timeout: 8000 });

    // FIX LỖI 3: scroll vào view (filter sidebar có thể bị overlap)
    await filterLocator.scrollIntoViewIfNeeded();
    await filterLocator.click();

    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async getProductNames(): Promise<string[]> {
    return await this.productItems
      .locator('.product-name, [data-testid="product-name"]')
      .allInnerTexts();
  }

  async getProductPrices(): Promise<number[]> {
    const texts = await this.productItems
      .locator('.product-price, [data-testid="product-price"]')
      .allInnerTexts();
    return texts.map(t => parseFloat(t.replace(/[^0-9.]/g, '')));
  }

  async clearFilters() {
    // FIX LỖI 2: dùng .first() đề phòng nhiều nút "xóa bộ lọc"
    const clearBtn = this.page
      .locator('[data-testid="clear-filters"]')
      .or(this.page.locator('button').filter({ hasText: /xóa bộ lọc|clear filter/i }))
      .first();

    if (await clearBtn.isVisible()) {
      // FIX LỖI 3: scroll trước khi click
      await clearBtn.scrollIntoViewIfNeeded();
      await clearBtn.click();
      await this.page.waitForLoadState('networkidle', { timeout: 8000 });
    }
  }
}
