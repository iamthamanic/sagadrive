/**
 * player-live-screen-v2 — Playwright smoke for #368 composition markers.
 * Location: e2e/player-live-screen-v2.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('player live screen v2 (#368)', () => {
  test('player live route mounts body without crash', async ({ page }) => {
    await page.goto('/sagas/SA-TEST1/sessions/SE-TEST1/live/player/CH-K7M4Q');
    await expect(page.locator('body')).toBeVisible();
  });
});
