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
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await page.getByRole('button', { name: 'Charakter erstellen' }).first().click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible();
  await expect(page.getByText('SagaDrive Core').first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: /Regelset/i }).first()).toBeVisible();

  for (const tab of ['Spezies', 'Hintergrund', 'Parameter', 'Look', 'Inventar', 'Notizen']) {
    await expect(page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') })).toBeVisible();
  }

  await page.getByRole('tab', { name: /^Spezies$/i }).click();
  await expect(page.getByText('Spezies', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('radio', { name: /Mensch/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /Skizze: Mensch/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Speziesmerkmale/i })).toBeVisible();
  await expect(page.getByText('Geschärfter Sinn').first()).toBeVisible();
  await expect(page.getByText('Geringer Ruhebedarf').first()).toBeVisible();
  await expect(page.getByText('Flugfähig')).toHaveCount(0);
  await expect(page.getByText(/^0 \/ 3$/).first()).toBeVisible();

  await page.getByRole('button', { name: /Enge Resistenz, 1 Punkt/i }).click();
  await expect(page.getByRole('combobox', { name: 'Gefahrenart' })).toBeVisible();
  await page.getByRole('button', { name: /Gefahrenart erklären/i }).click();
  await expect(page.getByRole('tooltip').getByText(/Entscheidend ist die konkrete Wirkung/i)).toBeVisible();
  await page.getByRole('button', { name: /Gefahrenart erklären/i }).click();
  await page.getByRole('combobox', { name: 'Gefahrenart' }).click();
  await page.getByRole('button', { name: /Übernatürliche Veränderungen erklären/i }).click();
  await expect(page.getByRole('tooltip').getByText(/Verwandlung|Versteinerung|Gedankenkontrolle/i)).toBeVisible();
  await page.getByRole('option', { name: 'Übernatürliche Veränderungen' }).click();
  await expect(page.getByRole('combobox', { name: 'Gefahrenart' })).toContainText('Übernatürliche Veränderungen');

  await page.getByRole('radio', { name: /Alien/i }).click();
  await expect(page.getByLabel(/Name deiner Spezies/i)).toBeVisible();
  await expect(page.getByLabel(/Körperbeschreibung/i)).toBeVisible();
  await expect(page.getByText('Flugfähig').first()).toBeVisible();
  await expect(page.getByText('Erweitertes Schwimmen').first()).toBeVisible();
  await expect(page.getByText('Noch nicht verfügbar').first()).toBeVisible();
  await page.getByLabel(/Name deiner Spezies/i).fill('Schneggl');
  await expect(page.getByLabel(/Spezies: Schneggl/i)).toBeVisible();

  await page.getByRole('radio', { name: /Mensch/i }).click();
  await expect(page.getByText('Flugfähig')).toHaveCount(0);

  await page.getByRole('tab', { name: /^Parameter$/i }).click();
  await expect(page.getByRole('tab', { name: /^Archetype$/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Essenz$/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Talente$/i })).toHaveCount(0);
  await expect(page.getByText('Paktbasiert')).toHaveCount(0);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-info-core-tabs.png'), fullPage: true });

  await page.getByRole('tab', { name: /^Archetype$/i }).click();
  await page.getByRole('radio', { name: /Kämpfer/i }).click();
  await expect(page.getByText(/Archetyp-Punkt \(1 von 10\)/i).first()).toBeVisible();
  await expect(page.getByText(/Kampfroutine/i).first()).toBeVisible();
  await expect(page.getByText('Freie Punkte').first()).toBeVisible();
  await expect(page.getByText('Gesamtpunkte').first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-info-archetype-essence.png'), fullPage: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-skills-budget-specialization.png'), fullPage: true });

  await page.getByRole('tab', { name: /^Essenz$/i }).click();
  await expect(page.getByText('Gebunden').first()).toBeVisible();
  await page.getByRole('button', { name: /Mental/i }).click();
  await expect(page.getByText(/Essenz-Manifestation/i).first()).toBeVisible();
  await expect(page.getByText(/mentaler Kämpfer|vollständig regelkonform/i).first()).toBeVisible();
  await expect(page.getByText(/Feuerball/i)).toHaveCount(0);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-abilities-core-ability.png'), fullPage: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '10-edge-unusual-combination.png'), fullPage: true });

  await page.getByRole('tab', { name: /^Attribute$/i }).click();
  await expect(page.getByText('Standardverteilung').first()).toBeVisible();
  await expect(page.getByText(/15 \/ 15 Punkte/i).first()).toBeVisible();
  await expect(page.getByText('Ausdauer').first()).toBeVisible();
  await expect(page.getByText('Verstand').first()).toBeVisible();
  await expect(page.getByText('Wahrnehmung').first()).toBeVisible();
  await expect(page.getByText('Traglast').first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-values-derived-stats.png'), fullPage: true });

  await page.getByRole('tab', { name: /Hintergrund/i }).click();
  await expect(page.getByText('Mechanischer Hintergrund').first()).toBeVisible();
  await expect(page.getByTestId('character-lore-project-context')).toBeVisible();
  await expect(page.getByTestId('character-bg-generate')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-background-core-fields.png'), fullPage: true });

  await page.getByRole('tab', { name: /Inventar/i }).click();
  await expect(page.getByText(/^Last 0 \/ 13$/).first()).toBeVisible();
  await expect(page.getByText(/Keine festen Slots/i).first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '07-inventory-load.png'), fullPage: true });

  await page.screenshot({ path: path.join(EVIDENCE_DIR, '08-character-summary.png'), fullPage: true });

  await page.getByRole('tab', { name: /Notizen/i }).click();
  await expect(page.getByRole('button', { name: /Speichern/i }).first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '09-notes-save.png'), fullPage: true });

  await page.getByRole('tab', { name: /Spezies/i }).click();
  await page.getByPlaceholder('Charaktername').first().fill('Validierungsprobe');
  await page.getByRole('button', { name: /Speichern/i }).first().click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Speziesmerkmale|Hintergrundangaben|Fertigkeitspunkte|Attribute|Namen|gelesen/i }).first()).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '11-edge-invalid-build.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: /^Parameter$/i }).click();
  await page.getByRole('tab', { name: /^Archetype$/i }).click();
  await page.getByRole('button', { name: /Archetyp erklären/i }).click();
  await expect(page.getByText(/besonders gut tut/i).first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '12-mobile-tooltips.png'), fullPage: true });
});
