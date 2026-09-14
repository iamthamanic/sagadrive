import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * E2E: NPC promotion + controller UI hooks (#200).
 * Location: e2e/npc-creature-promotion-controller.spec.ts
 */

const EVIDENCE_DIR = '.qa/evidence/npc-creature-promotion-controller';

async function ensureLoggedIn(page: Page) {
  await page.goto('/');
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }
  await expect(
    page
      .getByRole('heading', { name: 'Dashboard' })
      .or(page.getByRole('button', { name: 'Home' }))
      .or(page.getByRole('button', { name: 'Dashboard' }))
      .first(),
  ).toBeVisible({ timeout: 15_000 });
}

async function openNpcsTab(page: Page) {
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'NPCs & Kreaturen' }).click();
  await expect(page.locator('[data-npc-library-browser]')).toBeVisible({ timeout: 20_000 });
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('template → Charakter daraus erstellen opens CharacterEditor with unresolved banner', async ({
  page,
}) => {
  test.setTimeout(90_000);

  await page.route('**/rest/v1/npc_creature_definitions*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await openNpcsTab(page);

  const templateCta = page.locator('[data-npc-library-template-to-character]').first();
  await expect(templateCta).toBeVisible({ timeout: 20_000 });
  await templateCta.click();

  await expect(page.getByRole('heading', { name: /Charakter Editor/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('[data-npc-promotion-unresolved]')).toBeVisible();
  await expect(page.locator('[data-npc-promotion-unresolved]')).toContainText(/offene Entscheidungen/i);

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-template-create-character.png'),
    fullPage: true,
  });
});

test('promotion CTAs present for core templates (German labels)', async ({ page }) => {
  test.setTimeout(60_000);

  await page.route('**/rest/v1/npc_creature_definitions*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await ensureLoggedIn(page);
  await openNpcsTab(page);

  await expect(page.getByText('Charakter daraus erstellen').first()).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-mobile-template-cta.png'),
    fullPage: true,
  });
});
