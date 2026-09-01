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
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await page.getByRole('button', { name: 'Charakter erstellen' }).first().click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible();
  await expect(page.getByText('SagaDrive Core').first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: /Regelset/i }).first()).toBeVisible();

  for (const tab of ['Spezies', 'Parameter', 'Look', 'Inventar', 'Statistik']) {
    await expect(page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') })).toBeVisible();
  }
  await expect(page.getByRole('tab', { name: /^Hintergrund$/i })).toHaveCount(0);

  await page.getByRole('tab', { name: /^Spezies$/i }).click();
  await expect(page.getByText('Spezies', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('radio', { name: /Mensch/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /Skizze: Mensch/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Speziesmerkmale/i })).toBeVisible();
  await expect(page.getByText('Geschärfter Sinn').first()).toBeVisible();
  await expect(page.getByText('Geringer Ruhebedarf').first()).toBeVisible();
  await expect(page.getByText('Flugfähig')).toHaveCount(0);
  await expect(page.getByText(/^0 \/ 3$/).first()).toBeVisible();
  await expect(page.getByText(/Speziespunkte steigen nicht automatisch mit der Charakterstufe/i).first()).toBeVisible();

  await page.getByRole('button', { name: /Enge Resistenz, 1 Punkt/i }).click();
  const firstResistance = page.getByRole('combobox', { name: 'Enge Resistenz: Gefahrenart' });
  await expect(firstResistance).toBeVisible();
  await page.getByRole('button', { name: /Enge Resistenz: Gefahrenart erklären/i }).click();
  await expect(page.getByRole('tooltip').getByText(/konkrete Wirkung, nicht ihre Quelle/i)).toBeVisible();
  await page.getByRole('button', { name: /Enge Resistenz: Gefahrenart erklären/i }).click();
  await firstResistance.click();
  const supernaturalOption = page.getByRole('option', { name: /Übernatürliche Veränderungen/i });
  await supernaturalOption.scrollIntoViewIfNeeded();
  await expect(page.getByRole('listbox').getByText(/keine Illusionen und keine Gedankenkontrolle/i)).toBeVisible();
  await page.getByRole('option', { name: /Gift \/ Toxine/i }).click();
  await page.getByRole('button', { name: /Weitere Auswahl/i }).click();
  const resistanceSelects = page.getByRole('combobox', { name: /Enge Resistenz: Gefahrenart/ });
  await expect(resistanceSelects).toHaveCount(2);
  await resistanceSelects.nth(1).click();
  await expect(page.getByRole('option', { name: /Gift \/ Toxine/i })).toBeDisabled();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-species-duplicate-option-blocked.png'), fullPage: true });
  await page.getByRole('option', { name: /Krankheit \/ Infektion/i }).click();

  await page.getByRole('button', { name: /Geschärfter Sinn, 1 Punkt/i }).click();
  const senseSelect = page.getByRole('combobox', { name: 'Geschärfter Sinn: Sinn' });
  await expect(senseSelect).toBeVisible();
  await page.getByRole('button', { name: /Geschärfter Sinn: Sinn erklären/i }).click();
  await expect(page.getByRole('tooltip').getByText(/keine neue Sinnesart/i)).toBeVisible();
  await page.getByRole('button', { name: /Geschärfter Sinn: Sinn erklären/i }).click();
  await senseSelect.click();
  await expect(page.getByRole('listbox').getByText(/Geräusche entscheidend sind/i)).toBeVisible();
  await page.getByRole('option', { name: /Hören/i }).click();
  await expect(page.getByText(/^3 \/ 3$/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Weitere Auswahl/i }).first()).toBeDisabled();
  await page.getByLabel(/^Weitere Auswahl:/i).first().click();
  await expect(page.getByRole('tooltip').getByText(/Startbudget ist mit 3 \/ 3/i)).toBeVisible();
  await expect(page.getByRole('tooltip').getByText(/Weltprofil-Modul „Speziesentwicklung“/i)).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-species-repeatable-two-resistances.png'), fullPage: true });

  await page.getByLabel('Stufe').click();
  await page.getByRole('option', { name: '10', exact: true }).click();
  await expect(page.getByText(/^3 \/ 3$/).first()).toBeVisible();
  await page.getByLabel('Stufe').click();
  await page.getByRole('option', { name: '1', exact: true }).click();

  await page.getByRole('button', { name: /Enge Resistenz abwählen/i }).click();
  await page.getByRole('button', { name: /Geschärfter Sinn abwählen/i }).click();
  await expect(page.getByText(/^0 \/ 3$/).first()).toBeVisible();

  await page.getByRole('button', { name: /Umweltanpassung, 1 Punkt/i }).click();
  const environmentSelect = page.getByRole('combobox', { name: 'Umweltanpassung: Umgebung' });
  await expect(environmentSelect).toBeVisible();
  await environmentSelect.click();
  await expect(page.getByRole('listbox').getByText(/großer Höhe und dünner Luft/i)).toBeVisible();
  await page.getByRole('option', { name: /Hochgebirge & dünne Luft/i }).click();
  await page.getByRole('button', { name: /Umweltanpassung entfernen/i }).click();

  await page.getByRole('radio', { name: /Alien/i }).click();
  await expect(page.getByLabel(/Name deiner Spezies/i)).toBeVisible();
  await expect(page.getByLabel(/Körperbeschreibung/i)).toBeVisible();
  await expect(page.getByText('Flugfähig').first()).toBeVisible();
  await expect(page.getByText('Erweitertes Schwimmen').first()).toBeVisible();
  await expect(page.getByText('Noch nicht verfügbar').first()).toBeVisible();
  await page.getByLabel(/Name deiner Spezies/i).fill('Schneggl');
  await expect(page.getByLabel(/Spezies: Schneggl/i)).toBeVisible();

  await page.getByRole('button', { name: /Erweiterte Sicht, 2 Punkte/i }).click();
  const sightSelect = page.getByRole('combobox', { name: 'Erweiterte Sicht: Sichtform' });
  await expect(sightSelect).toBeVisible();
  await sightSelect.click();
  await expect(page.getByRole('listbox').getByText(/Natürliche Dunkelheit allein/i)).toBeVisible();
  await page.getByRole('option', { name: /Dunkelsicht/i }).click();
  await page.getByRole('button', { name: /Erweiterte Sicht entfernen/i }).click();

  await page.getByRole('button', { name: /Extremumwelt, 3 Punkte/i }).click();
  const extremeSelect = page.getByRole('combobox', { name: 'Erweiterte Sicht: Sichtform' });
  await expect(extremeSelect).toBeVisible();
  await extremeSelect.click();
  await expect(page.getByRole('listbox').getByText(/Natürliche Dunkelheit allein/i)).toBeVisible();
  await page.getByRole('option', { name: /Dunkelsicht/i }).click();
  await page.getByRole('button', { name: /Erweiterte Sicht entfernen/i }).click();

  await page.getByRole('button', { name: /Extremumwelt, 3 Punkte/i }).click();
  const extremeEnvironmentSelect = page.getByRole('combobox', { name: 'Extremumwelt: Extremumwelt' });
  await expect(extremeEnvironmentSelect).toBeVisible();
  await extremeEnvironmentSelect.click();
  await expect(page.getByRole('listbox').getByText(/ohne Atemluft/i)).toBeVisible();
  await page.getByRole('option', { name: /Vakuum & Sauerstofflosigkeit/i }).click();
  await expect(page.getByText(/^3 \/ 3$/).first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-species-repeatable-dropdowns.png'), fullPage: true });

  await page.getByRole('radio', { name: /Mensch/i }).click();
  await expect(page.getByText('Flugfähig')).toHaveCount(0);
  await expect(page.getByText(/^0 \/ 3$/).first()).toBeVisible();

  await page.getByRole('tab', { name: /^Parameter$/i }).click();
  await expect(page.getByRole('tab', { name: /^Kompetenzen$/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Archetype$/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Essenz$/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Attribute$/i })).toHaveCount(0);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-info-core-tabs.png'), fullPage: true });

  await page.getByRole('tab', { name: /^Archetype$/i }).click();
  await page.getByRole('radio', { name: /Kämpfer/i }).click();
  await expect(page.getByText(/Archetyp-Punkt \(1 von 10\)/i).first()).toBeVisible();
  await expect(page.getByText(/Kampfroutine/i).first()).toBeVisible();
  await expect(page.getByText(/Parameter → Kompetenzen/i).first()).toBeVisible();
  await expect(page.getByText('Freie Fertigkeitspunkte')).toHaveCount(0);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-info-archetype-essence.png'), fullPage: true });

  await page.getByRole('tab', { name: /^Essenz$/i }).click();
  await expect(page.getByText('Gebunden').first()).toBeVisible();
  await page.getByRole('button', { name: /Mental/i }).click();
  await expect(page.getByText(/Essenz-Manifestation/i).first()).toBeVisible();
  await expect(page.getByText(/mentaler Kämpfer|vollständig regelkonform/i).first()).toBeVisible();
  await expect(page.getByText(/Feuerball/i)).toHaveCount(0);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-abilities-core-ability.png'), fullPage: true });

  await page.getByRole('tab', { name: /^Kompetenzen$/i }).click();
  await expect(page.getByText('Grundattribute').first()).toBeVisible();
  await expect(page.getByText(/15 \/ 15 Punkte/i).first()).toBeVisible();
  await expect(page.getByText('Ausdauer').first()).toBeVisible();
  await expect(page.getByText('Verstand').first()).toBeVisible();
  await expect(page.getByText('Wahrnehmung').first()).toBeVisible();
  await expect(page.getByText('Bühne & Öffentlichkeit').first()).toBeVisible();
  await expect(page.getByText('Natur & Wildnis').first()).toBeAttached();
  await expect(page.getByText('Hintergrund Framework').first()).toBeVisible();
  await expect(page.getByRole('radio', { name: /Eigener Hintergrund/i })).toBeAttached();

  const backgroundPanel = page.locator('[data-background-panel]');
  const healingFramework = page.getByRole('radio', { name: /Heilung & Fürsorge/i });
  await healingFramework.click();
  await expect(healingFramework).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });
  await expect(backgroundPanel.getByText('Training · 2 wählen').first()).toBeVisible();
  await expect(backgroundPanel.getByText(/^0 \/ 2$/).first()).toBeVisible();
  await expect(backgroundPanel.getByText('Empfohlen')).toHaveCount(0);

  const medicineNode = backgroundPanel.locator('[data-background-skill-node="medicine"]');
  const insightNode = backgroundPanel.locator('[data-background-skill-node="insight"]');
  const survivalNode = backgroundPanel.locator('[data-background-skill-node="survival"]');
  const awarenessNode = backgroundPanel.locator('[data-background-skill-node="awareness"]');
  await expect(medicineNode).toHaveCount(1);
  await expect(insightNode).toHaveCount(1);
  await expect(survivalNode).toHaveCount(1);
  await expect(awarenessNode).toHaveCount(1);

  await medicineNode.locator('button').click();
  await expect(backgroundPanel.getByText(/^1 \/ 2$/).first()).toBeVisible();
  await insightNode.locator('button').click();
  await expect(backgroundPanel.getByText(/^2 \/ 2$/).first()).toBeVisible();
  await expect(backgroundPanel.getByRole('button', { name: 'Auswahl ändern' })).toBeVisible();
  await expect(medicineNode).toHaveCount(1);
  await expect(insightNode).toHaveCount(1);
  await expect(survivalNode).toHaveCount(0);
  await expect(awarenessNode).toHaveCount(0);
  await expect(backgroundPanel.locator('[data-background-skill-grid]')).toHaveAttribute('data-training-view', 'selected');

  await backgroundPanel.getByRole('button', { name: 'Auswahl ändern' }).click();
  await expect(backgroundPanel.locator('[data-background-skill-grid]')).toHaveAttribute('data-training-view', 'pool');
  await expect(survivalNode).toHaveCount(1);
  await expect(awarenessNode).toHaveCount(1);
  await insightNode.locator('button').click();
  await expect(backgroundPanel.getByText(/^1 \/ 2$/).first()).toBeVisible();
  await awarenessNode.locator('button').click();
  await expect(backgroundPanel.getByRole('button', { name: 'Auswahl ändern' })).toBeVisible();
  await expect(medicineNode).toHaveCount(1);
  await expect(awarenessNode).toHaveCount(1);
  await expect(insightNode).toHaveCount(0);
  await expect(survivalNode).toHaveCount(0);

  await page.getByRole('button', { name: /Medizin: Notfallmedizin/i }).click();
  await page.getByLabel('Milieuzugang').fill('Notaufnahmen');
  await page.getByLabel('Kontakt').fill('Dr. Sera Malk');
  await page.getByLabel('Komplikation').fill('Alte Schulden');
  await page.getByLabel('Zusätzliche Kommunikationsform').fill('Gebärdensprache');
  await expect(page.getByText(/Hintergrund ist regelkonform vollständig/i)).toBeVisible();
  await expect(page.getByText('Fertigkeiten & Quellen').first()).toBeVisible();
  await expect(page.getByText('Freie Punkte').first()).toBeVisible();
  await expect(page.getByText('Gesamt').first()).toBeVisible();
  await expect(page.getByTestId('character-lore-project-context')).toBeVisible();
  await expect(page.getByTestId('character-bg-generate')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Notizen$/i })).toBeVisible();
  await expect(page.locator('#notes')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-background-core-fields.png'), fullPage: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-skills-budget-specialization.png'), fullPage: true });

  await page.getByText('Medizin', { exact: true }).last().click();
  await expect(page.getByText(/Standardattribut: Verstand/i).last()).toBeVisible();
  await expect(page.getByText(/Standardbeziehung – keine Voraussetzung/i)).toBeVisible();

  await page.getByRole('tab', { name: /Inventar/i }).click();
  await expect(page.getByText(/^Last 0 \/ 13$/).first()).toBeVisible();
  await expect(page.getByText(/Keine festen Slots/i).first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '07-inventory-load.png'), fullPage: true });

  await page.getByRole('tab', { name: /Statistik/i }).click();
  await expect(page.getByText(/Speichere den Charakter zuerst/i)).toBeVisible();
  await expect(page.getByRole('tab', { name: /Notizen/i })).toHaveCount(0);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '13-statistics-tab.png'), fullPage: true });

  await page.getByRole('tab', { name: /Spezies/i }).click();
  await page.getByPlaceholder('Charaktername').first().fill('Validierungsprobe');
  await page.getByRole('button', { name: /Speichern/i }).first().click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Speziesmerkmale|Hintergrund|Fertigkeitspunkte|Attribute|Namen|gelesen|Vervollständige/i }).first()).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '11-edge-invalid-build.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Enge Resistenz, 1 Punkt/i }).click();
  await expect(page.getByRole('combobox', { name: 'Enge Resistenz: Gefahrenart' })).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-species-mobile-repeatable.png'), fullPage: true });

  await page.getByRole('tab', { name: /^Parameter$/i }).click();
  await page.getByRole('tab', { name: /^Kompetenzen$/i }).click();
  await expect(page.getByRole('radio', { name: /Heilung & Fürsorge/i })).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '12-mobile-competencies.png'), fullPage: true });
});
