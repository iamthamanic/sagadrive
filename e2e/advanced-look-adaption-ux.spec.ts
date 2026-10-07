/**
 * Advanced Look Adaption UX — capability status in Look Editor (#356).
 * Location: e2e/advanced-look-adaption-ux.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './helpers/auth';

test.describe('Advanced Look Adaption UX (#356)', () => {
  test('Look create editor shows Advanced capability rows disabled', async ({ page }) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);
    await page.goto('/looks/create');
    await expect(page.locator('[data-look-create-chooser]')).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-look-create-path="preset"]').click();
    await expect(page.locator('[data-look-editor-workspace="v1"]')).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('[data-look-editor-nav-item="advanced"]').click();
    await expect(page.locator('[data-look-advanced-adaption="v1"]')).toBeVisible();
    await expect(page.locator('[data-look-advanced-mode="rendered"]')).toBeVisible();
    await expect(page.locator('[data-look-advanced-mode="realtime"]')).toBeVisible();
    await expect(page.locator('[data-look-advanced-run="rendered"]')).toBeDisabled();
    await expect(page.locator('[data-look-advanced-run="realtime"]')).toBeDisabled();
    await expect(page.locator('[data-look-advanced-status="unavailable"]').first()).toBeVisible();
  });
});
