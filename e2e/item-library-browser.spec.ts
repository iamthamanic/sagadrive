import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/item-library-browser';
const VIEW_MODE_STORAGE_KEY = 'sagadrive_library_items_view_mode';

async function ensureLoggedIn(page: Page) {
  await page.goto('/');
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }
  // Desktop nav uses "Dashboard"; mobile bottom nav uses "Home".
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

async function openItemsTab(page: Page) {
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'Items' }).click();
  await expect(page.locator('[data-item-library-browser]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-item-library-results], [data-item-library-empty], [data-item-library-error]')).toBeVisible({
    timeout: 20_000,
  });
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('library items tab lists catalog with search, filters, and create navigation', async ({
  page,
}) => {
  test.setTimeout(90_000);

  await page.route('**/rest/v1/inventory_item_definitions*', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, []);
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await openItemsTab(page);

  await expect(page.getByText(/\d+ Gegenstand/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Neues Item erstellen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listenansicht' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-item-library-card]').first()).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-items-list-desktop.png'),
    fullPage: true,
  });

  await page.locator('[data-item-library-search]').fill('smart');
  await page.getByLabel('Setting hinzufügen').click();
  await page.getByRole('option', { name: 'Gegenwart' }).click();
  await page.getByLabel('Typ hinzufügen').click();
  await page.getByRole('option', { name: /Gerät/ }).click();

  await expect(page.getByText(/von \d+ Gegenständen/).first()).toBeVisible();
  await expect(page.getByText('Setting: Gegenwart').first()).toBeVisible();
  await expect(page.getByText('Typ: Gerät').first()).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-items-search-filter.png'),
    fullPage: true,
  });

  const firstCard = page.locator('[data-item-library-card]').first();
  const itemId = await firstCard.getAttribute('data-item-library-card');
  expect(itemId).toBeTruthy();
  await firstCard.click();
  await expect(page).toHaveURL(new RegExp(`/items/${encodeURIComponent(itemId!)}$`));
  await page.goBack();
  await expect(page).toHaveURL(/\/library$/);
  await openItemsTab(page);

  await page.getByRole('button', { name: 'Neues Item erstellen' }).click();
  await expect(page).toHaveURL(/\/items\/create$/);
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '04-items-create-nav.png'),
    fullPage: true,
  });
});

test('library items grid persists on mobile and search-empty stays actionable', async ({
  page,
}) => {
  test.setTimeout(90_000);

  await page.route('**/rest/v1/inventory_item_definitions*', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, []);
      return;
    }
    await route.fallback();
  });

  // Authenticate on desktop chrome, then resize (mobile nav labels "Home").
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openItemsTab(page);

  await expect(page.getByRole('button', { name: 'Grid-Ansicht' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-item-library-results][data-view-mode="grid"]')).toBeVisible();

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow).toBe(false);

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '03-items-grid-mobile.png'),
    fullPage: true,
  });

  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    VIEW_MODE_STORAGE_KEY,
  );
  expect(stored).toBe('grid');

  await page.locator('[data-item-library-search]').fill('zzzz-kein-treffer-xyz');
  await expect(page.getByText('Keine Treffer für Suche und Filter')).toBeVisible();
  await page
    .locator('[data-item-library-empty]')
    .getByRole('button', { name: 'Filter zurücksetzen' })
    .click();
  await expect(page.locator('[data-item-library-results]')).toBeVisible();
});
