import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * E2E: Library NPCs & Kreaturen browser (#197).
 * Location: e2e/npc-creature-library-browser.spec.ts
 */

const EVIDENCE_DIR = '.qa/evidence/npc-creature-library-browser';

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

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
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

test('library NPCs tab order, empty state, filters, and keyboard focus', async ({ page }) => {
  test.setTimeout(90_000);

  await page.route('**/rest/v1/npc_creature_definitions*', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, []);
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await openNpcsTab(page);

  const tabs = page.getByRole('tab');
  await expect(tabs.nth(0)).toHaveText(/Charaktere/);
  await expect(tabs.nth(1)).toHaveText(/NPCs & Kreaturen/);
  await expect(tabs.nth(2)).toHaveText(/Abenteuer/);
  await expect(tabs.nth(3)).toHaveText(/Welten/);
  await expect(tabs.nth(4)).toHaveText(/Items/);

  await expect(page.getByText('Noch keine NPCs oder Kreaturen angelegt.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Erste Figur erstellen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alle' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-npc-library-search]')).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-npcs-tab-desktop.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Kreaturen' }).click();
  await expect(page.getByRole('button', { name: 'Kreaturen' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.locator('[data-npc-library-search]').fill('wächter');
  await expect(page.getByText('Keine Treffer für Suche und Filter')).toBeVisible();
  await page
    .locator('[data-npc-library-empty]')
    .getByRole('button', { name: 'Filter zurücksetzen' })
    .click();
  await expect(page.getByText('Noch keine NPCs oder Kreaturen angelegt.')).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-npcs-empty-or-list.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-npc-library-browser]')).toBeVisible();
  await page.locator('[data-npc-library-search]').focus();
  await expect(page.locator('[data-npc-library-search]')).toBeFocused();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '03-npcs-statblock-mobile.png'),
    fullPage: true,
  });
});

test('library NPCs tab opens read-only statblock for a definition', async ({ page }) => {
  test.setTimeout(90_000);

  const row = {
    id: 'personal:11111111-1111-4111-8111-111111111111',
    scope: 'personal',
    owner_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    world_profile_id: null,
    status: 'active',
    payload_version: 1,
    payload: {
      payloadVersion: 1,
      name: 'Waldwächter',
      description: 'Ein stiller Hüter.',
      kind: 'npc',
      category: 'npc',
      sheetMode: 'compact',
      level: 5,
      combatProfile: 'balanced',
      combatRole: 'standard',
      tags: ['wald'],
    },
    created_at: '2026-09-14T00:00:00Z',
    updated_at: '2026-09-14T00:00:00Z',
  };

  await page.route('**/rest/v1/npc_creature_definitions*', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, [row]);
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await ensureLoggedIn(page);
  await openNpcsTab(page);

  await expect(page.getByText('Waldwächter').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Waldwächter öffnen|Öffnen/ }).first().click();
  await expect(page.locator('[data-npc-statblock-view]')).toBeVisible();
  await expect(page.getByText('Gesundheit')).toBeVisible();
  await expect(page.getByText('Verteidigung')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waldwächter' })).toBeVisible();
});
