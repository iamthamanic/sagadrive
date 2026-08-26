import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/sagadrive-character-editor-core';

async function ensureLoggedIn(page: Page) {
  await page.goto('/');
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }
  await expect(page.getByRole('button', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 15_000 });
}

test.beforeAll(() => { fs.mkdirSync(EVIDENCE_DIR, { recursive: true }); });

test('character editor exposes the SagaDrive Core creation flow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await page.getByRole('button', { name: 'Charakter erstellen' }).first().click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible();
  await expect(page.getByText('SagaDrive Core').first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: /Regelset/i })).toHaveCount(0);

  for (const tab of ['Info', 'Hintergrund', 'Werte', 'Fertigkeiten', 'Fähigkeiten', 'Look', 'Inventar', 'Notizen']) {
    await expect(page.getByRole('tab', { name: new RegExp(tab, 'i') })).toBeVisible();
  }

  await expect(page.getByText('Primärarchetyp').first()).toBeVisible();
  await expect(page.getByText('Primäre Essenz').first()).toBeVisible();
  await expect(page.getByText('Wesenart').first()).toBeVisible();
  await expect(page.getByText('Gebunden').first()).toBeVisible();
  await expect(page.getByText('Paktbasiert')).toHaveCount(0);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-info-core-tabs.png'), fullPage: true });

  await page.getByRole('tab', { name: /Werte/i }).click();
  await expect(page.getByText('Standardverteilung').first()).toBeVisible();
  await expect(page.getByText('Ausdauer').first()).toBeVisible();
  await expect(page.getByText('Verstand').first()).toBeVisible();
  await expect(page.getByText('Wahrnehmung').first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-values-derived-stats.png'), fullPage: true });

  await page.getByRole('tab', { name: /Fertigkeiten/i }).click();
  await expect(page.getByText('Zuerst Primärarchetyp wählen').first()).toBeVisible();

  await page.getByRole('tab', { name: /Hintergrund/i }).click();
  await expect(page.getByText('Mechanischer Hintergrund').first()).toBeVisible();
  await expect(page.getByTestId('character-lore-project-context')).toBeVisible();
  await expect(page.getByTestId('character-bg-generate')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-background-core-fields.png'), fullPage: true });

  await page.getByRole('tab', { name: /Inventar/i }).click();
  await expect(page.getByText(/^Last 0 \/ 13$/).first()).toBeVisible();
  await expect(page.getByText(/Keine festen Slots/i).first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '07-inventory-load.png'), fullPage: true });
});
