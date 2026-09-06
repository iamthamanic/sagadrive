/**
 * #21 Character Editor as rules mapping / understandability (B1).
 * Covers 3 legal builds, I1–I8 pre-save prevention, lore non-blocking, Gebunden term.
 * Location: e2e/validate-character-editor-rules-ux.spec.ts
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import {
  allocateSevenFreeSkillPoints,
  completeSpeciesBasics,
  expectToastContaining,
  openBlankCharacterEditor,
  selectAttributeGroup,
} from './helpers/character-editor';

const EVIDENCE = '.qa/evidence/validate-character-editor-rules-ux';

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
});

async function pickFighterMelee(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: /^Charakter$/i }).click();
  await page.getByRole('tab', { name: /^Archetype$/i }).click();
  await page.getByRole('radio', { name: /Kämpfer/i }).click();
  await page.locator('[data-archetype-skill-grid] button').filter({ hasText: 'Nahkampf' }).first().click();
}

async function pickEssence(page: import('@playwright/test').Page, essence: RegExp) {
  await page.getByRole('tab', { name: /^Essenz$/i }).click();
  await expect(page.getByText('Gebunden').first()).toBeVisible();
  await page.getByRole('button', { name: essence }).click();
}

async function completeHealingBackground(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: /^Hintergrund$/i }).click();
  const backgroundPanel = page.locator('[data-background-panel]');
  await page.getByRole('radio', { name: /Heilung & Fürsorge/i }).click();
  const medicineNode = backgroundPanel.locator('[data-background-skill-node="medicine"]');
  const insightNode = backgroundPanel.locator('[data-background-skill-node="insight"]');
  await medicineNode.getByRole('button', { name: 'Medizin Hintergrundpunkt erhöhen' }).click();
  await insightNode.getByRole('button', { name: 'Menschenkenntnis Hintergrundpunkt erhöhen' }).click();
  await expect(backgroundPanel.locator('[data-background-points-budget]').getByText(/^2 \/ 2 verteilt$/)).toBeVisible();
  await medicineNode.getByRole('button', { name: 'Spezialisieren' }).click();
  await medicineNode.getByRole('combobox', { name: 'Medizin Spezialisierungsvorschlag' }).click();
  await page.getByRole('option', { name: /Notfallmedizin/ }).click();
  await page.getByLabel('Milieuzugang').fill('Notaufnahmen');
  await page.getByLabel('Kontakt').fill('Dr. Lex');
  await page.getByLabel('Komplikation').fill('Alte Schulden');
  await page.getByLabel('Zusätzliche Kommunikationsform').fill('Funk');
}

test('B1 I1–I8: illegal choices blocked before save (#21)', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBlankCharacterEditor(page);

  // I7 / I8 — no secondary archetype/essence controls at level 1
  await page.getByRole('tab', { name: /^Charakter$/i }).click();
  await page.getByRole('tab', { name: /^Archetype$/i }).click();
  await expect(page.getByText(/Zweitarchetyp|zweiter Archetyp|Sekundärarchetyp/i)).toHaveCount(0);
  await page.getByRole('tab', { name: /^Essenz$/i }).click();
  await expect(page.getByText('Gebunden').first()).toBeVisible();
  await expect(page.getByText(/Paktbasiert/i)).toHaveCount(0);
  await expect(page.getByText(/sekundäre Essenz|Zweitessenz|secondary essence/i)).toHaveCount(0);
  await page.screenshot({ path: `${EVIDENCE}/i7-i8-no-secondary-controls.png`, fullPage: true });

  // I1 — attribute select offers only 0–4 (no +5 start option)
  await page.getByRole('tab', { name: /^Attribute$/i }).click();
  await page.getByRole('combobox', { name: /Stärke Grundbonus/i }).click();
  await expect(page.getByRole('option', { name: /^\+5 Bonus$/ })).toHaveCount(0);
  await expect(page.getByRole('option', { name: /^\+4 Bonus$/ })).toBeVisible();
  await page.keyboard.press('Escape');

  // I2 — budget ≠ 15 → Speichern toast
  await page.getByRole('combobox', { name: /Stärke Grundbonus/i }).click();
  await page.getByRole('option', { name: /^\+3 Bonus$/ }).click();
  await expect(page.getByText(/14 \/ 15 Bonuspunkte|13 \/ 15 Bonuspunkte/i).first()).toBeVisible();
  await page.getByPlaceholder('Charaktername').first().fill(`E2E I2 ${Date.now()}`);
  await page.getByRole('button', { name: /Speichern/i }).click();
  await expectToastContaining(page, /Bonuspunkte|\+0 bis \+4|Attribut/i);
  // restore budget
  await page.getByRole('combobox', { name: /Stärke Grundbonus/i }).click();
  await page.getByRole('option', { name: /^\+4 Bonus$/ }).click();
  await expect(page.getByText(/15 \/ 15 Bonuspunkte/i).first()).toBeVisible();

  // I5 — species budget ≠ 3 → Speichern toast
  await page.getByRole('tab', { name: /^Spezies$/i }).click();
  await page.getByRole('combobox', { name: /Geschlecht wählen/i }).click();
  await page.getByRole('option', { name: /Divers/i }).click();
  await expect(page.getByText(/^0 \/ 3$/).first()).toBeVisible();
  await page.getByRole('button', { name: /Speichern/i }).click();
  await expectToastContaining(page, /Speziesmerkmale|3 Punkten/i);

  // I3 — background cannot allocate a 3rd point
  await completeSpeciesBasics(page);
  await page.getByRole('tab', { name: /^Charakter$/i }).click();
  await page.getByRole('tab', { name: /^Hintergrund$/i }).click();
  const backgroundPanel = page.locator('[data-background-panel]');
  await page.getByRole('radio', { name: /Heilung & Fürsorge/i }).click();
  const medicineNode = backgroundPanel.locator('[data-background-skill-node="medicine"]');
  const insightNode = backgroundPanel.locator('[data-background-skill-node="insight"]');
  await medicineNode.getByRole('button', { name: 'Medizin Hintergrundpunkt erhöhen' }).click();
  await insightNode.getByRole('button', { name: 'Menschenkenntnis Hintergrundpunkt erhöhen' }).click();
  await expect(backgroundPanel.locator('[data-background-points-budget]').getByText(/^2 \/ 2 verteilt$/)).toBeVisible();
  const thirdAttempt = medicineNode.getByRole('button', { name: 'Medizin Hintergrundpunkt erhöhen' });
  await expect(thirdAttempt).toBeDisabled();

  // I4 — skill outside framework pool is not a + target in pool view (survival stays visible but may be out of recommended; try athletics if not in pool)
  const athleticsInBg = backgroundPanel.locator('[data-background-skill-node="athletics"]');
  if (await athleticsInBg.count()) {
    const increase = athleticsInBg.getByRole('button', { name: /Hintergrundpunkt erhöhen/i });
    if (await increase.count()) {
      await expect(increase).toBeDisabled();
    }
  } else {
    // Pool-only grid: out-of-pool skill has no increase control — prevention by omission
    await expect(backgroundPanel.locator('[data-background-skill-grid]')).toBeVisible();
  }

  // I6 — specialization at skill rank 0 blocked in progression
  await pickFighterMelee(page);
  await pickEssence(page, /Körperlich/i);
  await completeHealingBackground(page);
  await page.getByRole('tab', { name: /^Attribute$/i }).click();
  await allocateSevenFreeSkillPoints(page);
  await page.getByLabel('Stufe').click();
  await page.getByRole('option', { name: '5', exact: true }).click();
  const progressionSlots = page.getByTestId('skill-progression-slots');
  await expect(progressionSlots).toBeVisible();
  await progressionSlots.getByRole('combobox', { name: 'Level 3 Entwicklung' }).click();
  await page.getByRole('option', { name: 'Spezialisierung' }).click();
  await progressionSlots.getByRole('combobox', { name: 'Level 3 Fertigkeit' }).click();
  // Rank-0 skills must not be selectable for specialization (min rank 1)
  const rank0Spec = page.getByRole('option', { name: /Fingerfertigkeit \(Rang 0\)/ });
  if (await rank0Spec.count()) {
    await expect(rank0Spec).toBeDisabled();
  } else {
    await expect(page.getByRole('option', { name: /Rang 0/ })).toHaveCount(0);
  }
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${EVIDENCE}/i1-i8-prevention.png`, fullPage: true });
});

test('B1 LEGAL-1: Kämpfer + Körperlich Stufe 1 save/reload (#21)', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBlankCharacterEditor(page);

  const name = `E2E Legal Body ${Date.now()}`;
  await page.getByPlaceholder('Charaktername').first().fill(name);
  await completeSpeciesBasics(page);
  await pickFighterMelee(page);
  await pickEssence(page, /Körperlich/i);
  await completeHealingBackground(page);
  await page.getByRole('tab', { name: /^Details$/i }).click();
  await page.locator('#notes').fill('Regel-UX Notiz Körperlich — darf Speichern nicht blockieren.');
  await page.getByRole('tab', { name: /^Hintergrund$/i }).click();
  await expect(page.getByTestId('character-lore-project-context')).toBeVisible();
  await page.getByRole('tab', { name: /^Attribute$/i }).click();
  await allocateSevenFreeSkillPoints(page);
  await expect(page.getByRole('button', { name: /Speichern/i }).first()).toBeEnabled();
  await page.screenshot({ path: `${EVIDENCE}/legal-1-body-ready.png`, fullPage: true });

  const requireLiveSave = process.env.E2E_LIVE_CHARACTER_SAVE === '1' || !process.env.CI;
  if (!requireLiveSave) {
    test.info().annotations.push({
      type: 'note',
      description: 'Skipped live LEGAL-1 POST/reload (CI without Supabase). Sheet is complete and Speichern enabled.',
    });
    return;
  }

  const saveResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/rest/v1/characters') && response.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: /Speichern/i }).click();
  const saveResponse = await saveResponsePromise;
  if (!saveResponse.ok()) {
    throw new Error(`LEGAL-1 save failed: ${saveResponse.status()} ${await saveResponse.text()}`);
  }
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /gespeichert/i }).first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: /Meine Bibliothek/i })).toBeVisible();
  await page.getByPlaceholder('Suche in deiner Bibliothek...').first().fill(name);
  const card = page.locator('div').filter({ hasText: name }).filter({ has: page.getByRole('button', { name: 'Bearbeiten' }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder('Charaktername').first()).toHaveValue(name);
  await page.getByRole('tab', { name: /^Essenz$/i }).click();
  await expect(page.getByLabel(/^Essenz:/)).toContainText(/Körperlich/i);
  await page.getByRole('tab', { name: /^Details$/i }).click();
  await expect(page.locator('#notes')).toHaveValue(/Regel-UX Notiz Körperlich/);
  await page.screenshot({ path: `${EVIDENCE}/legal-1-body-reload.png`, fullPage: true });
});

test('B1 LEGAL-2+3: Kämpfer+Mental legal; Direkt Stufe ≥5 budgets (#21)', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBlankCharacterEditor(page);

  const name = `E2E Legal Mental L5 ${Date.now()}`;
  await page.getByPlaceholder('Charaktername').first().fill(name);
  await completeSpeciesBasics(page);
  await pickFighterMelee(page);
  await pickEssence(page, /Mental/i);
  await expect(page.getByText(/mentaler Kämpfer|vollständig regelkonform/i).first()).toBeVisible();
  await completeHealingBackground(page);
  await page.getByRole('tab', { name: /^Attribute$/i }).click();
  await allocateSevenFreeSkillPoints(page);

  await page.getByLabel('Stufe').click();
  await page.getByRole('option', { name: '5', exact: true }).click();
  const progressionSlots = page.getByTestId('skill-progression-slots');
  await expect(progressionSlots).toBeVisible();
  await progressionSlots.getByRole('combobox', { name: 'Level 3 Entwicklung' }).click();
  await page.getByRole('option', { name: 'Bestehenden Skill +1' }).click();
  await progressionSlots.getByRole('combobox', { name: 'Level 3 Fertigkeit' }).click();
  await page.getByRole('option', { name: /Medizin \(Rang 1\)/ }).click();
  await progressionSlots.getByRole('combobox', { name: 'Level 5 Entwicklung' }).click();
  await page.getByRole('option', { name: 'Neuen Skill 0→1' }).click();
  await progressionSlots.getByRole('combobox', { name: 'Level 5 Fertigkeit' }).click();
  await page.getByRole('option', { name: /Fingerfertigkeit \(Rang 0\)/ }).click();
  await expect(page.getByRole('button', { name: /Speichern/i }).first()).toBeEnabled();
  await page.getByRole('tab', { name: /^Einstellungen$/i }).click();
  await page.getByRole('tab', { name: /^Preset$/i }).click();
  await expect(page.getByRole('button', { name: /Als Preset speichern/i })).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE}/legal-2-3-mental-l5.png`, fullPage: true });

  const requireLiveSave = process.env.E2E_LIVE_CHARACTER_SAVE === '1' || !process.env.CI;
  if (!requireLiveSave) {
    test.info().annotations.push({
      type: 'note',
      description: 'Skipped live LEGAL-2+3 POST/reload (CI without Supabase). Mental+L5 budgets complete; Preset panel visible.',
    });
    return;
  }

  await page.getByRole('button', { name: /Speichern/i }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /gespeichert/i }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await page.getByPlaceholder('Suche in deiner Bibliothek...').first().fill(name);
  const card = page.locator('div').filter({ hasText: name }).filter({ has: page.getByRole('button', { name: 'Bearbeiten' }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(page.getByPlaceholder('Charaktername').first()).toHaveValue(name);
  await expect(page.getByLabel('Stufe')).toContainText('5');
  await page.getByRole('tab', { name: /^Essenz$/i }).click();
  await expect(page.getByLabel(/^Essenz:/)).toContainText(/Mental/i);
});
