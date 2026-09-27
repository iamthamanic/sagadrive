import { defineConfig, devices } from '@playwright/test';

const devUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3004';
const isCi = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  outputDir: '.qa/test-results',
  fullyParallel: true,
  forbidOnly: isCi,
  // CI: two retries absorb transient shell/auth races without masking hard failures.
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  timeout: isCi ? 120_000 : 60_000,
  expect: {
    timeout: isCi ? 20_000 : 5_000,
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    actionTimeout: isCi ? 20_000 : 15_000,
    navigationTimeout: isCi ? 45_000 : 30_000,
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
    reuseExistingServer: !isCi,
    timeout: 180_000,
  },
});
