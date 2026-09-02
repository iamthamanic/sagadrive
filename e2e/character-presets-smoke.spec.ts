/**
 * Lite smoke for Character Presets MVP: create chooser + Einstellungen → Preset.
 * Evidence: .qa/evidence/character-presets/
 *
 * Verify-UI gap (documented blocker for 03/05):
 * Full save → release → from-preset needs a green SagaDrive Core sheet
 * (species traits, background 2-of-4, free skill points, attribute budget).
 * Existing character-editor e2e does not complete a valid Speichern either.
 * Screenshots 03-preset-version-pick / 05-version-list-after-save remain
 * manual until a shared valid-sheet fixture exists.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/character-presets';

async function ensureLoggedIn(page: Page) {
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

test('create chooser shows two cards and Preset tab under Einstellungen', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: /Bibliothek/i }).first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('button', { name: /Charakter erstellen|Neuer Charakter/i }).first().click();
  await expect(page.getByRole('heading', { name: /Charakter erstellen/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Eigenen Charakter erstellen/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Preset wählen/i })).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-create-chooser-cards.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: /Preset wählen/i }).click();
  await expect(page.getByText(/Noch keine Presets|SagaDrive-Presets bald/i).first()).toBeVisible({
    timeout: 10_000,
  });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-preset-empty-state.png'),
    fullPage: true,
  });

  // Close picker / go back to chooser if still open, then create own character
  const ownCard = page.getByRole('button', { name: /Eigenen Charakter erstellen/i });
  if (await ownCard.isVisible().catch(() => false)) {
    await ownCard.click();
  } else {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Charakter erstellen|Neuer Charakter/i }).first().click();
    await page.getByRole('button', { name: /Eigenen Charakter erstellen/i }).click();
  }

  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('tab', { name: /Einstellungen/i }).click();
  await expect(page.getByRole('tab', { name: /^Preset$/i })).toBeVisible();
  await page.getByRole('tab', { name: /^Preset$/i }).click();
  await expect(page.getByText(/Speichere den Charakter zuerst|Als Preset speichern/i).first()).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '04-settings-preset-subtab.png'),
    fullPage: true,
  });
});

test('documents save→release→from-preset Verify-UI gap', async () => {
  // BLOCKER: no shared valid-sheet Playwright fixture; see file header + acceptance Screenshots 03/05.
  test.info().annotations.push({
    type: 'blocker',
    description:
      '03/05 evidence requires green Speichern + Als Preset speichern + Version freigeben + Preset wählen; deferred until valid-sheet fixture.',
  });
  expect(true).toBe(true);
});
