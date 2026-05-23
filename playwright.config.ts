import { defineConfig, devices } from '@playwright/test';

/**
 * Load environment variables from .env file
 * Copy .env.example to .env and customize values
 */
require('dotenv').config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : parseInt(process.env.RETRIES || '0'),
  workers: process.env.CI ? 1 : parseInt(process.env.WORKERS || '4'),

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['./scripts/excel-reporter.ts'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://www.maisononline.vn/?view=men',
    trace: 'on-first-retry',
    screenshot: (process.env.SCREENSHOT as 'off' | 'on' | 'only-on-failure') || 'only-on-failure',
    video: (process.env.VIDEO as 'off' | 'on' | 'retain-on-failure') || 'retain-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000'),
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || '10000'),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
