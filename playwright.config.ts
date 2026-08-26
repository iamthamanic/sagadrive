import { defineConfig, devices } from '@playwright/test';

const devUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3004';

export default defineConfig({
  testDir: './e2e',
  outputDir: '.qa/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: devUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: devUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
