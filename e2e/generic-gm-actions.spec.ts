/**
 * generic-gm-actions — Playwright smoke for #371.
 * Location: e2e/generic-gm-actions.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('generic gm actions (#371)', () => {
  test('gm live route still mounts', async ({ page }) => {
    await page.goto('/sagas/SA-TEST1/sessions/SE-TEST1/live/gamemaster');
    await expect(page.locator('body')).toBeVisible();
  });
});
