/**
 * Production UX Integrity — smoke that primary surfaces stay honest (#493).
 * Location: e2e/production-ux-integrity.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './helpers/auth';

test.describe('Production UX Integrity (#493)', () => {
  test('GM panel: deferred scene generate + no demo roster labels', async ({ page }) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);
    await page.goto('/gamemaster');
    await expect(page.locator('[data-gm-panel="v2"]')).toBeVisible({ timeout: 20_000 });
    const generate = page.locator('[data-gm-scene-generate-deferred]');
    await expect(generate).toBeVisible();
    await expect(generate).toBeDisabled();
    await page.locator('[data-gm-tab-characters]').click();
    await expect(page.locator('[data-gm-characters-empty]')).toBeVisible();
    await expect(page.getByText('Aria Windwhisper')).toHaveCount(0);
  });

  test('session-join create: fixture panel absent or DEV-labeled', async ({ page }) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);
    await page.goto('/session-join');
    await expect(page.getByRole('button', { name: /erstellen|Session erstellen/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    const fixture = page.locator('[data-prepared-adventure-fixture="v1"]');
    const count = await fixture.count();
    if (count > 0) {
      await expect(fixture).toHaveAttribute('data-dev-only-fixture', 'true');
      await expect(page.getByText(/DEV ·/)).toBeVisible();
    } else {
      expect(count).toBe(0);
    }
  });

  test('profile: deferred settings disabled; sign-out remains', async ({ page }) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /Profil/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /Benachrichtigungen/i }).click();
    await expect(page.locator('[data-settings-deferred="session-invites"]')).toBeDisabled();
    await page.getByRole('tab', { name: /^Profil$/i }).click();
    await expect(page.getByRole('button', { name: /Abmelden/i })).toBeEnabled();
  });
});
