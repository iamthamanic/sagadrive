import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/library-entity-browser';
const VIEW_MODE_STORAGE_KEY = 'sagadrive_library_characters_view_mode';

type StoredCharacter = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  class: string;
  race: string;
  ruleset_key: string;
  level: number;
  portrait_url: string | null;
  created_at: string;
  updated_at: string;
};

const MOCK_CHARACTERS: StoredCharacter[] = [
  {
    id: 'char-1',
    owner_user_id: '00000000-0000-4000-8000-000000000001',
    name: 'Kara Sturmklinge',
    description: null,
    class: 'Wanderer',
    race: 'Mensch',
    ruleset_key: 'sagadrive-core',
    level: 3,
    portrait_url: 'http://localhost:3004/test-assets/portrait-kara.png',
    created_at: '2026-08-28T10:00:00.000Z',
    updated_at: '2026-08-28T10:00:00.000Z',
  },
  {
    id: 'char-2',
    owner_user_id: '00000000-0000-4000-8000-000000000001',
    name: 'Bror Steinfuss',
    description: null,
    class: 'Schmied',
    race: 'Zwerg',
    ruleset_key: 'sagadrive-core',
    level: 1,
    portrait_url: null,
    created_at: '2026-08-28T09:00:00.000Z',
    updated_at: '2026-08-28T09:00:00.000Z',
  },
];

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

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('library characters tab browses via carousel/list with persisted view mode', async ({ page }) => {
  test.setTimeout(60_000);

  await page.route('**/rest/v1/characters*', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, MOCK_CHARACTERS);
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await expect(page.getByText('2 Charaktere').first()).toBeVisible();

  await expect(page.getByRole('button', { name: 'Listenansicht' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Kara Sturmklinge').first()).toBeVisible();
  await expect(page.getByText('Bror Steinfuss').first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-characters-list-view.png'), fullPage: true });

  await page.getByRole('button', { name: 'Karussell-Ansicht' }).click();
  await expect(page.getByRole('button', { name: 'Karussell-Ansicht' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: /carousel/i }).or(page.locator('[data-slot="carousel"]'))).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-characters-carousel-view.png'), fullPage: true });

  const stored = await page.evaluate((key) => window.localStorage.getItem(key), VIEW_MODE_STORAGE_KEY);
  expect(stored).toBe('carousel');
});

test('library characters search-empty state stays actionable', async ({ page }) => {
  test.setTimeout(60_000);

  await page.route('**/rest/v1/characters*', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, MOCK_CHARACTERS);
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await expect(page.getByText('2 Charaktere').first()).toBeVisible();

  await page.getByPlaceholder('Suche in deiner Bibliothek...').first().fill('Unbekannter Held');
  await expect(page.getByText('Keine Charaktere gefunden').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ersten Charakter erstellen' })).toBeHidden();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-characters-search-empty.png'), fullPage: true });

  await page.getByPlaceholder('Suche in deiner Bibliothek...').first().fill('Kara');
  await expect(page.getByText('1 Charakter').first()).toBeVisible();
  await expect(page.getByText('Kara Sturmklinge').first()).toBeVisible();
});