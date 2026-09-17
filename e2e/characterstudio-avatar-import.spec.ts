/**
 * Custom VRM/GLB import UI (#5) — panel visible on Look tab.
 * Location: e2e/characterstudio-avatar-import.spec.ts
 */
import { expect, test } from '@playwright/test';
import { ensureLoggedIn } from './helpers/character-editor';

test('Look tab exposes 3D character import CTA and status region', async ({ page }) => {
  test.setTimeout(180_000);
  await ensureLoggedIn(page);

  const createViaEmptyState = page.getByRole('button', { name: 'Charakter erstellen' });
  if (await createViaEmptyState.count()) {
    await createViaEmptyState.first().click();
  } else {
    await page.getByRole('heading', { name: 'Neuer Charakter' }).first().click();
  }
  await expect(page.getByRole('heading', { name: 'Charakter erstellen' })).toBeVisible();
  await page.getByRole('button', { name: /Eigenen Charakter erstellen/i }).click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('tab', { name: /^Look$/i }).click();
  const panel = page.locator('[data-avatar-import-panel]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-avatar-import-cta]')).toBeVisible();
  await expect(panel.locator('[data-avatar-import-status="idle"]')).toBeVisible();
});
