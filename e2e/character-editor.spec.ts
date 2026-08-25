import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/feat-character-studio-avatar';

async function ensureLoggedIn(page: import('@playwright/test').Page) {
  await page.goto('/');
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }
  await expect(page.getByRole('button', { name: 'Dashboard' }).first()).toBeVisible({
    timeout: 15_000,
  });
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('character editor ruleset fields and BG composer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

  await page.getByRole('button', { name: 'Charakter erstellen' }).first().click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unbenannt' }).first()).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-info-sagadrive-core.png'),
    fullPage: true,
  });

  await expect(page.getByText('Archetyp').first()).toBeVisible();
  await expect(page.getByText('Essenzprofil').first()).toBeVisible();

  await page.getByRole('combobox', { name: /Regelset/i }).first().click();
  await page.getByRole('option', { name: /Dungeons & Dragons 5\.5e/i }).click();
  await expect(page.getByRole('combobox', { name: 'Klasse' }).first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Spezies' }).first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Hintergrund' }).first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Essenzprofil' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Archetyp' })).toHaveCount(0);
  await expect(page.getByText(/D&D 5\.5e nutzt Klasse/i).first()).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '03-info-dnd-5-5e.png'),
    fullPage: true,
  });

  await page.getByRole('tab', { name: 'BG' }).click();
  await expect(page.getByTestId('character-bg-generate')).toBeVisible();
  await expect(page.getByTestId('character-bg-accept-example')).toBeVisible();

  await page.getByTestId('character-bg-generate').click();
  await expect(page.getByTestId('character-bg-status')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('character-bg-story')).toHaveValue('');

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '04-bg-generate-status.png'),
    fullPage: true,
  });
});
