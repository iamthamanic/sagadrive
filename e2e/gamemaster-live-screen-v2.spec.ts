/**
 * gamemaster-live-screen-v2 — Playwright smoke for #369.
 * Location: e2e/gamemaster-live-screen-v2.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('gamemaster live screen v2 (#369)', () => {
  test('gm live route mounts without crash', async ({ page }) => {
    await page.goto('/sagas/SA-TEST1/sessions/SE-TEST1/live/gamemaster');
    await expect(page.locator('body')).toBeVisible();
  });
});
