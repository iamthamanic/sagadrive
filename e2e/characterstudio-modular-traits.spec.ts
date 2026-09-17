/**
 * CharacterStudio modular traits (#4) — card pickers on Look tab.
 * Location: e2e/characterstudio-modular-traits.spec.ts
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLoggedIn } from './helpers/character-editor';

const EVIDENCE_DIR = '.qa/evidence/characterstudio-modular-traits';

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('Look tab exposes modular trait card pickers with selected state', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
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
  await expect(page.getByRole('heading', { name: 'Haare & Merkmale' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kleidung' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Accessoires' })).toBeVisible();

  const hairGroup = page.locator('[data-trait-group="hair"]');
  await expect(hairGroup).toBeVisible();
  const longHair = hairGroup.getByRole('option', { name: /Lang/i });
  await longHair.click();
  await expect(longHair).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-trait-cards-hair-selected.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(hairGroup.locator('button[role="option"]').first()).toBeVisible();
  const box = await hairGroup.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeLessThanOrEqual(390);

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-trait-cards-mobile.png'),
    fullPage: true,
  });
});
