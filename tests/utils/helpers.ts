import { Page } from '@playwright/test';

// ─── Test Data ────────────────────────────────────────────────────────────────

export const TEST_USERS = {
  valid: {
    email: 'test@example.com',
    password: 'Test@12345',
  },
  invalidPassword: {
    email: 'test@example.com',
    password: 'wrongpassword',
  },
  nonExistent: {
    email: 'nonexistent@example.com',
    password: 'Test@12345',
  },
};

export const INVALID_EMAILS = [
  'notanemail',
  'missing@domain',
  '@nodomain.com',
  'spaces in@email.com',
  '',
];

export const SHIPPING_ADDRESSES = {
  hcm: {
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    address: '123 Đường Lê Lợi',
    province: 'Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
  },
  hanoi: {
    fullName: 'Trần Thị B',
    phone: '0912345678',
    address: '45 Phố Huế',
    province: 'Hà Nội',
    district: 'Quận Hai Bà Trưng',
    ward: 'Phường Bùi Thị Xuân',
  },
};

export const SEARCH_KEYWORDS = {
  valid: 'áo thun',
  noResult: 'xyzxyzxyz12345notexist',
};

export const FILTER_VALUES = {
  size: 'M',
  brand: 'Nike',
  color: 'Đen',
  priceRange: '200000-500000',
};

export const REGISTER_USERS = {
  valid: {
    fullName: 'Nguyễn Test User',
    password: 'Test@12345',
    confirmPassword: 'Test@12345',
  },
  mismatchPassword: {
    fullName: 'Test User',
    password: 'Test@12345',
    confirmPassword: 'DifferentPass@99',
  },
};

// ─── Error Message Patterns ────────────────────────────────────────────────────

export const ERROR_MESSAGES = {
  invalidPassword: /sai mật khẩu|mật khẩu không đúng|invalid password|incorrect/i,
  userNotFound: /không tìm thấy|tài khoản không tồn tại|user not found/i,
  emailExists: /email đã được sử dụng|email already exists|đã tồn tại/i,
  emailRequired: /email.*bắt buộc|email.*required|vui lòng nhập email/i,
  passwordRequired: /mật khẩu.*bắt buộc|password.*required|vui lòng nhập mật khẩu/i,
  invalidEmail: /email không hợp lệ|invalid email|định dạng email/i,
  passwordMismatch: /mật khẩu không khớp|passwords do not match/i,
  passwordTooShort: /mật khẩu phải có ít nhất 8|password must be at least 8|password.*short/i,
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Login via API to skip UI login flow for tests that don't test auth
 */
export async function loginViaAPI(page: Page, email: string, password: string) {
  await page.request.post('/api/auth/login', {
    data: { email, password },
  });
  // Reload to pick up session cookie
  await page.reload();
}

/**
 * Add a product to cart via API for checkout/cart tests
 */
export async function addProductViaAPI(page: Page, productId: string, quantity: number = 1) {
  await page.request.post('/api/cart/add', {
    data: { productId, quantity },
  });
}

/**
 * Clear cart via API
 */
export async function clearCartViaAPI(page: Page) {
  await page.request.delete('/api/cart/clear');
}

/**
 * Wait for network to settle after an action
 */
export async function waitForNetworkIdle(page: Page, timeout = 3000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Parse price string to number (handles VND formatting)
 * e.g. "250.000 đ" → 250000
 */
export function parsePrice(priceText: string): number {
  return parseFloat(priceText.replace(/[^\d]/g, ''));
}
