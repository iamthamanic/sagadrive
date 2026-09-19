/**
 * Provider-agnostic 3D generation + 150MB import UI contract.
 * Location: .qa/runs/2026-09-19-provider-agnostic-3d-generation.spec.ts
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLoggedIn } from '../../e2e/helpers/character-editor';

const EVIDENCE = '.qa/evidence/provider-agnostic-3d-generation';

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
});

async function openCharacterEditor(page: import('@playwright/test').Page) {
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
}

test('3D Generator shows Provider, Preset Empfohlen, summary, advanced, 150MB import', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await openCharacterEditor(page);

  // Switch avatar source to Meshy / KI
  const meshyCard = page.locator('[data-avatar-source-card="meshy"]');
  await expect(meshyCard).toBeVisible({ timeout: 15_000 });
  await meshyCard.click();

  await expect(page.locator('[data-avatar-meshy-provider]')).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({ path: path.join(EVIDENCE, '01-provider-preset-default.png'), fullPage: true });

  await expect(page.locator('[data-avatar-gen-preset]')).toBeVisible();
  await expect(page.locator('[data-avatar-gen-summary]')).toBeVisible();
  await expect(page.locator('[data-avatar-gen-summary]')).toContainText(/4K|Texture|Pose|PBR|Modell/i);

  const advancedToggle = page.locator('[data-avatar-gen-advanced-toggle]');
  await expect(advancedToggle).toBeVisible();
  await advancedToggle.click();
  await expect(page.locator('[data-avatar-gen-advanced]')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE, '02-advanced-settings-meshy.png'), fullPage: true });

  // Dirty preset: change texture in advanced
  const textureSetting = page.locator('[data-avatar-gen-setting="textureQuality"]');
  if (await textureSetting.count()) {
    await textureSetting.click();
    await page.getByRole('option', { name: /2K/i }).click();
    await expect(page.locator('[data-avatar-gen-preset-label]')).toContainText(/angepasst/i);
  }
  await page.screenshot({ path: path.join(EVIDENCE, '03-preset-dirty-label.png'), fullPage: true });

  // Import panel 150 MB copy
  await page.locator('[data-avatar-source-card="import"]').click();
  await expect(page.getByText(/max\. 150 MB/i)).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: path.join(EVIDENCE, '04-import-150mb.png'), fullPage: true });
});
