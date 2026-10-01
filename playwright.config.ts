import { defineConfig, devices } from '@playwright/test';

const devUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3004';
const isCi = !!process.env.CI;

/**
 * Desktop `chromium` runs the full e2e suite.
 * `mobile-chrome` / `tablet-chrome` only run adaptive-ui-quality.spec.ts
 * so the device matrix does not multiply every journey (AU / #483).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: '.qa/test-results',
  // Platform-agnostic baselines so darwin-authored PNGs work on linux CI (#483).
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: isCi,
  // CI: two retries absorb transient shell/auth races without masking hard failures.
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  timeout: isCi ? 120_000 : 60_000,
  expect: {
    timeout: isCi ? 20_000 : 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
    },
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
    {
      name: 'mobile-chrome',
      testMatch: /adaptive-ui-quality\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        // CI installs Chromium only — keep phone emulation on Chromium.
        browserName: 'chromium',
      },
    },
    {
      name: 'tablet-chrome',
      testMatch: /adaptive-ui-quality\.spec\.ts/,
      use: {
        ...devices['iPad Mini'],
        // iPad Mini defaults to WebKit; force Chromium for CI parity.
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: devUrl,
    reuseExistingServer: !isCi,
    timeout: 180_000,
  },
});
