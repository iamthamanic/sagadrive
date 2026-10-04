/**
 * player-join-character-assignment — Playwright smoke for #478.
 * Location: e2e/player-join-character-assignment.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('player join character assignment (#478)', () => {
  test('session-join join tab exposes character assignment surface', async ({ page }) => {
    await page.goto('/session-join?intent=join&saga=SA-TEST1');
    await expect(page.locator('[data-character-assignment="v1"]')).toBeVisible();
    await expect(page.locator('[data-join-with-character]')).toBeVisible();
  });

  test('player-resolve route mounts without crash', async ({ page }) => {
    await page.goto('/sagas/SA-TEST1/sessions/SE-TEST1/live/player');
    await expect(page.locator('body')).toBeVisible();
  });
});
