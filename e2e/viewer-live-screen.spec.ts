/**
 * viewer-live-screen — Playwright smoke for #370.
 * Location: e2e/viewer-live-screen.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('viewer live screen (#370)', () => {
  test('viewer live route mounts without crash', async ({ page }) => {
    await page.goto('/sagas/SA-TEST1/sessions/SE-TEST1/live/viewer');
    await expect(page.locator('body')).toBeVisible();
  });
});
