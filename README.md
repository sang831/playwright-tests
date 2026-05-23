# Playwright E2E Test Suite

Bộ test tự động cho các chức năng: Đăng nhập/Đăng ký, Giỏ hàng, Tìm kiếm & Bộ lọc, Thanh toán.

## Cấu trúc thư mục

```
tests/
├── auth/
│   ├── login.spec.ts        # 9 test cases đăng nhập
│   └── register.spec.ts     # 6 test cases đăng ký
├── cart/
│   └── cart.spec.ts         # 10 test cases giỏ hàng
├── search/
│   └── search-filter.spec.ts # 6 test cases tìm kiếm + bộ lọc
├── checkout/
│   └── checkout.spec.ts     # 10 test cases thanh toán
├── pages/                   # Page Object Models
│   ├── LoginPage.ts
│   ├── CartPage.ts
│   ├── SearchPage.ts
│   └── CheckoutPage.ts
└── utils/
    └── helpers.ts           # Test data & helper functions
```

## Cài đặt

```bash
npm install
npx playwright install
```

## Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy theo module
npm run test:auth      # Chạy tests đăng nhập
npm run test:cart      # Chạy tests giỏ hàng
npm run test:search    # Chạy tests tìm kiếm
npm run test:checkout  # Chạy tests thanh toán

# Chạy một file cụ thể
npx playwright test tests/auth/login.spec.ts

# Chạy với UI mode (debug visual)
npm run test:ui

# Chạy headed (xem trình duyệt)
npm run test:headed

# Xem HTML report
npm run test:report
```

## 📊 Xuất Test Cases ra Excel

### 1. Xuất danh sách test cases (trước khi chạy)
```bash
npm run export:test-cases
```
Tạo file `test-cases-export.xlsx` chứa tất cả test cases được parse từ code:
- STT
- Test ID (TC_LOGIN_01, TC_CART_01, ...)
- Tên test
- Module
- File
- Cột để ghi Trạng thái, Kết quả, Ghi chú

### 2. Xuất kết quả test sau khi chạy
```bash
npm test
```
Tự động xuất file `playwright-report/test-results.xlsx` chứa:
- ✅ Danh sách test cases với trạng thái (PASS/FAIL/SKIP)
- ⏱️ Thời gian chạy mỗi test (ms)
- ❌ Chi tiết lỗi nếu có
- 📈 Sheet "Summary" với thống kê:
  - Tổng test
  - Số PASS / FAIL / SKIP
  - Pass Rate (%)
  - Tổng thời gian chạy

## Cấu hình môi trường

Tạo file `.env` hoặc set biến môi trường:

```env
BASE_URL=http://localhost:3000
```

## Lưu ý khi tích hợp

1. **Selectors**: Các selectors ưu tiên `data-testid`. Thêm attribute này vào components để test ổn định hơn.
2. **API helpers**: `loginViaAPI`, `addProductViaAPI` cần endpoint backend thực tế. Cập nhật URL trong `helpers.ts`.
3. **Test data**: Cập nhật `PRODUCT_ID`, `TEST_USERS`, `SHIPPING_ADDRESSES` trong `helpers.ts` cho phù hợp với data thực.
4. **Error messages**: Regex trong `expect(...).toHaveText(...)` có thể cần điều chỉnh theo text thực tế của app.

## Số lượng test cases

| Module          | Số test |
|-----------------|---------|
| Đăng nhập       | 9       |
| Đăng ký         | 6       |
| Giỏ hàng        | 10      |
| Tìm kiếm/Filter | 6       |
| Thanh toán      | 10      |
| **Tổng**        | **41**  |
