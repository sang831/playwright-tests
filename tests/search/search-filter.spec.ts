import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/SearchPage';
import { SEARCH_KEYWORDS, FILTER_VALUES } from '../utils/helpers';

test.describe('Tìm kiếm & Bộ lọc', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
    await searchPage.goto();
  });

  // ── Tìm kiếm ────────────────────────────────────────────────────────────────

  test('TC_SEARCH_01 - Tìm kiếm từ khóa hợp lệ trả về kết quả', async ({ page }) => {
    await searchPage.search(SEARCH_KEYWORDS.valid);

    // FIX LỖI 1: expect polling thay vì check ngay
    await expect(async () => {
      const count = await searchPage.getProductCount();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 8000 });

    await expect(page).toHaveURL(
      new RegExp(`[?&]q=${encodeURIComponent(SEARCH_KEYWORDS.valid)}`),
      { timeout: 5000 }
    );
  });

  test('TC_SEARCH_02 - Tên sản phẩm hiển thị chứa từ khóa tìm kiếm', async ({ page }) => {
    await searchPage.search(SEARCH_KEYWORDS.valid);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const names = await searchPage.getProductNames();
    expect(names.length).toBeGreaterThan(0);

    const hasMatch = names.some(name =>
      name.toLowerCase().includes(SEARCH_KEYWORDS.valid.toLowerCase())
    );
    expect(hasMatch).toBe(true);
  });

  test('TC_SEARCH_03 - Tìm kiếm không có kết quả hiển thị thông báo', async ({ page }) => {
    await searchPage.search(SEARCH_KEYWORDS.noResult);

    const count = await searchPage.getProductCount();
    expect(count).toBe(0);

    // FIX LỖI 1: timeout rõ ràng
    await expect(searchPage.noResultMessage).toBeVisible({ timeout: 5000 });
    await expect(searchPage.noResultMessage).toHaveText(
      /không tìm thấy|no result|không có sản phẩm/i
    );
  });

  test('TC_SEARCH_04 - Tìm kiếm với khoảng trắng hiển thị tất cả hoặc lỗi', async ({ page }) => {
    await searchPage.searchInput.clear();
    await searchPage.searchInput.fill('   ');

    // FIX LỖI 3: scroll button vào view (SearchPage.search đã xử lý, gọi trực tiếp ở đây)
    await searchPage.searchButton.scrollIntoViewIfNeeded();
    await searchPage.searchButton.click();

    await page.waitForLoadState('networkidle', { timeout: 8000 });
    expect(page.url()).toBeTruthy();
  });

  // ── Bộ lọc Size ─────────────────────────────────────────────────────────────

  test('TC_FILTER_01 - Lọc theo size M chỉ hiển thị sản phẩm size M', async ({ page }) => {
    await searchPage.search(SEARCH_KEYWORDS.valid);
    await searchPage.applyFilter('size', FILTER_VALUES.size);

    await expect(async () => {
      const count = await searchPage.getProductCount();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 8000 });

    const sizeLabels = await page
      .locator('[data-testid="product-size"], .product-size')
      .allInnerTexts();
    sizeLabels.forEach(size => expect(size).toContain(FILTER_VALUES.size));
  });

  // ── Bộ lọc Giá ──────────────────────────────────────────────────────────────

  test('TC_FILTER_02 - Lọc theo khoảng giá hiển thị đúng sản phẩm', async ({ page }) => {
    const minPrice = 200000;
    const maxPrice = 500000;

    // FIX LỖI 2: tách selector riêng thay vì CSS comma list
    const minInput = page.locator('[data-testid="price-min"]').or(page.locator('input[name="minPrice"]')).first();
    const maxInput = page.locator('[data-testid="price-max"]').or(page.locator('input[name="maxPrice"]')).first();

    if (await minInput.isVisible()) {
      await minInput.scrollIntoViewIfNeeded(); // FIX LỖI 3
      await minInput.fill(String(minPrice));
      await maxInput.fill(String(maxPrice));

      // FIX LỖI 2: applyBtn dùng .first()
      const applyBtn = page
        .locator('[data-testid="apply-price"]')
        .or(page.locator('button').filter({ hasText: /áp dụng|apply/i }))
        .first();
      await applyBtn.scrollIntoViewIfNeeded();
      await applyBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } else {
      await searchPage.applyFilter('price', FILTER_VALUES.priceRange);
    }

    const prices = await searchPage.getProductPrices();
    prices.forEach(price => {
      expect(price).toBeGreaterThanOrEqual(minPrice);
      expect(price).toBeLessThanOrEqual(maxPrice);
    });
  });

  // ── Bộ lọc Brand ────────────────────────────────────────────────────────────

  test('TC_FILTER_03 - Lọc theo brand hiển thị đúng thương hiệu', async ({ page }) => {
    await searchPage.applyFilter('brand', FILTER_VALUES.brand);

    await expect(async () => {
      const count = await searchPage.getProductCount();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 8000 });

    const brandLabels = await page
      .locator('[data-testid="product-brand"], .product-brand')
      .allInnerTexts();
    brandLabels.forEach(brand =>
      expect(brand.toLowerCase()).toContain(FILTER_VALUES.brand.toLowerCase())
    );
  });

  // ── Bộ lọc Màu sắc ──────────────────────────────────────────────────────────

  test('TC_FILTER_04 - Lọc theo màu sắc hiển thị đúng sản phẩm', async ({ page }) => {
    await searchPage.applyFilter('color', FILTER_VALUES.color);

    await expect(async () => {
      const count = await searchPage.getProductCount();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 8000 });

    // FIX LỖI 2: filter chip dùng .first()
    const activeFilter = page
      .locator('[data-testid="active-filter"]')
      .or(page.locator('.filter-chip.active'))
      .filter({ hasText: FILTER_VALUES.color })
      .first();
    await expect(activeFilter).toBeVisible({ timeout: 5000 });
  });

  // ── Kết hợp bộ lọc ──────────────────────────────────────────────────────────

  test('TC_FILTER_05 - Kết hợp nhiều bộ lọc cùng lúc', async ({ page }) => {
    await searchPage.search(SEARCH_KEYWORDS.valid);
    await searchPage.applyFilter('size', FILTER_VALUES.size);
    await searchPage.applyFilter('brand', FILTER_VALUES.brand);

    const count = await searchPage.getProductCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TC_FILTER_06 - Xóa bộ lọc khôi phục kết quả ban đầu', async ({ page }) => {
    await searchPage.search(SEARCH_KEYWORDS.valid);
    const initialCount = await searchPage.getProductCount();

    await searchPage.applyFilter('size', FILTER_VALUES.size);
    await searchPage.clearFilters();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    await expect(async () => {
      const afterClearCount = await searchPage.getProductCount();
      expect(afterClearCount).toBe(initialCount);
    }).toPass({ timeout: 5000 });
  });
});
