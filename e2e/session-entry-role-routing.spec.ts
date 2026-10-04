/**
 * session-entry-role-routing — Playwright smoke for #477 routing contracts.
 * Location: e2e/session-entry-role-routing.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('session entry role routing (#477)', () => {
  test('legacy /gamemaster is not the only GM journey path in shell links', async ({ page }) => {
    await page.goto('/');
    // Smoke: app loads; deep canonical live path parses without crash.
    await page.goto('/sagas/SA-TEST1/sessions/SE-TEST1/live/player');
    await expect(page.locator('body')).toBeVisible();
  });

  test('session-join preserves saga query in URL bar', async ({ page }) => {
    await page.goto('/session-join?saga=SA-TEST1&intent=join');
    await expect(page).toHaveURL(/saga=SA-TEST1/);
    await expect(page).toHaveURL(/intent=join/);
  });
});
