/**
 * Shared Character Editor helpers for Playwright E2E.
 * Location: e2e/helpers/character-editor.ts
 */
import { expect, type Page } from '@playwright/test';
import { ensureLoggedIn } from './auth';

export { ensureLoggedIn } from './auth';

export async function openBlankCharacterEditor(page: Page) {
  await ensureLoggedIn(page);
  const createViaEmptyState = page.getByRole('button', { name: 'Charakter erstellen' });
  if (await createViaEmptyState.count()) {
    await createViaEmptyState.first().click();
  } else {
    await page.getByRole('heading', { name: 'Neuer Charakter' }).first().click();
  }
  await expect(page.getByRole('heading', { name: 'Charakter erstellen' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Eigenen Charakter erstellen/i }).click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('tab', { name: /^Spezies$/i })).toBeVisible({ timeout: 15_000 });
}

export async function completeSpeciesBasics(page: Page, gender: 'female' | 'male' = 'female') {
  await page.getByRole('tab', { name: /^Spezies$/i }).click();
  const human = page.getByRole('radio', { name: /Mensch/i });
  if (await human.count()) {
    await human.click();
  }
  await page.getByRole('combobox', { name: /Geschlecht wählen/i }).click();
  await page
    .getByRole('option', {
      name: gender === 'male' ? /Männlich( gelesen)?/i : /Weiblich( gelesen)?/i,
    })
    .click();
  await page.getByRole('button', { name: /Geschärfter Sinn, 1 Punkt/i }).click();
  await page.getByRole('combobox', { name: 'Geschärfter Sinn: Sinn' }).click();
  await page.getByRole('option', { name: /Hören/i }).click();
  await page.getByRole('button', { name: /Enge Resistenz, 1 Punkt/i }).click();
  await page.getByRole('combobox', { name: 'Enge Resistenz: Gefahrenart' }).click();
  await page.getByRole('option', { name: /Gift \/ Toxine/i }).click();
  await page.getByRole('button', { name: /Geringer Ruhebedarf, 1 Punkt/i }).click();
  await expect(page.getByText(/^3 \/ 3$/).first()).toBeVisible();
}

/** Ensure the avatar preview settings menu is open (do not toggle closed). */
export async function ensureAvatarPreviewSettingsOpen(page: Page) {
  const gear = page.getByTestId('avatar-preview-settings');
  await expect(gear).toBeVisible({ timeout: 20_000 });
  const menu = page.getByTestId('avatar-preview-settings-menu');
  const expanded = (await gear.getAttribute('aria-expanded')) === 'true';
  const menuVisible = await menu.isVisible().catch(() => false);
  if (!expanded || !menuVisible) {
    await gear.click();
  }
  await expect(menu).toBeVisible({ timeout: 10_000 });
}

/** Open gear + Face Setup accordion and enter Face Mapping authoring. */
export async function openFaceMappingFromGear(page: Page) {
  await ensureAvatarPreviewSettingsOpen(page);
  const faceSetup = page.getByTestId('face-setup-section');
  await expect(faceSetup).toBeVisible({ timeout: 10_000 });
  await faceSetup.click();
  const openBtn = page.getByTestId('face-mapping-open');
  await expect(openBtn).toBeEnabled({ timeout: 60_000 });
  await openBtn.click();
  await expect(page.getByTestId('face-mapping-authoring-panel')).toBeVisible({ timeout: 20_000 });
}

/** Open gear + LiveAct accordion (sections start collapsed). */
export async function openAvatarPreviewLiveActSettings(page: Page) {
  await ensureAvatarPreviewSettingsOpen(page);
  const liveActTrigger = page.getByTestId('liveact-settings-accordion-trigger');
  await expect(liveActTrigger).toBeVisible({ timeout: 10_000 });
  const trackingToggle = page.getByTestId('liveact-tracking-toggle');
  if (!(await trackingToggle.isVisible().catch(() => false))) {
    await liveActTrigger.click();
  }
  await expect(trackingToggle).toBeVisible({ timeout: 10_000 });
}

/** Switch Spezies gender after basics are already filled (model swap). */
export async function switchSpeciesGender(page: Page, gender: 'female' | 'male') {
  await page.getByRole('tab', { name: /^Spezies$/i }).click();
  await page.getByRole('combobox', { name: /Geschlecht wählen/i }).click();
  await page.getByRole('option', { name: gender === 'male' ? /Männlich/i : /Weiblich/i }).click();
}

const FREE_SKILL_ATTRIBUTE: Readonly<Record<string, string>> = {
  Athletik: 'Stärke',
  Akrobatik: 'Geschicklichkeit',
  Heimlichkeit: 'Geschicklichkeit',
  Ermitteln: 'Verstand',
  Wissen: 'Verstand',
  Überzeugen: 'Charisma',
  Täuschen: 'Charisma',
};

export async function selectAttributeGroup(page: Page, attributeLabel: string) {
  const carousel = page.locator('[data-attribute-skills-carousel]');
  const radio = carousel.getByRole('radio', { name: attributeLabel, exact: true });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await radio.getAttribute('aria-checked')) === 'true') return;
    try {
      await radio.click({ timeout: 3_000 });
    } catch {
      await page.getByRole('button', { name: 'Nächstes Attribut' }).click();
      continue;
    }
    await expect(radio).toHaveAttribute('aria-checked', 'true', { timeout: 2_000 }).catch(() => undefined);
    if ((await radio.getAttribute('aria-checked')) === 'true') return;
    await page.getByRole('button', { name: 'Nächstes Attribut' }).click();
  }
  await expect(radio).toHaveAttribute('aria-checked', 'true');
}

export async function allocateSevenFreeSkillPoints(page: Page) {
  for (const skill of ['Athletik', 'Akrobatik', 'Heimlichkeit', 'Ermitteln', 'Wissen', 'Überzeugen', 'Täuschen']) {
    const attributeLabel = FREE_SKILL_ATTRIBUTE[skill];
    if (!attributeLabel) throw new Error(`Missing attribute mapping for ${skill}`);
    await selectAttributeGroup(page, attributeLabel);
    await page.getByRole('button', { name: `${skill} freien Punkt hinzufügen` }).click();
  }
  await expect(page.getByText(/7 \/ 7 Punkte/i).first()).toBeVisible();
}

export async function expectToastContaining(page: Page, pattern: RegExp) {
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: pattern }).first();
  await expect(toast).toBeVisible({ timeout: 10_000 });
}
