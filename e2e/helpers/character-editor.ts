/**
 * Shared Character Editor helpers for Playwright E2E.
 * Location: e2e/helpers/character-editor.ts
 */
import { expect, type Page } from '@playwright/test';

export async function ensureLoggedIn(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.removeItem('sagadrive:character-edit-id');
  });
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }
  await expect(page.getByRole('button', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 15_000 });
}

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

export async function completeSpeciesBasics(page: Page) {
  await page.getByRole('tab', { name: /^Spezies$/i }).click();
  await page.getByRole('combobox', { name: /Geschlecht wählen/i }).click();
  await page.getByRole('option', { name: /Weiblich/i }).click();
  await page.getByRole('button', { name: /Geschärfter Sinn, 1 Punkt/i }).click();
  await page.getByRole('combobox', { name: 'Geschärfter Sinn: Sinn' }).click();
  await page.getByRole('option', { name: /Hören/i }).click();
  await page.getByRole('button', { name: /Enge Resistenz, 1 Punkt/i }).click();
  await page.getByRole('combobox', { name: 'Enge Resistenz: Gefahrenart' }).click();
  await page.getByRole('option', { name: /Gift \/ Toxine/i }).click();
  await page.getByRole('button', { name: /Geringer Ruhebedarf, 1 Punkt/i }).click();
  await expect(page.getByText(/^3 \/ 3$/).first()).toBeVisible();
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
