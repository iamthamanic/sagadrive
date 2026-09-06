/**
 * Item Epic final acceptance E2E (#144) — Library Items → Workbench → Inventory
 * add-catalog labels (Core/Standard/Welt/Eigen where feasible). Viewport smoke
 * 1440 / 768 / 390. Deep contracts remain in scripts/*-check.mjs via test-gate.
 * Location: e2e/item-epic-acceptance.spec.ts
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/item-epic-acceptance';

async function ensureLoggedIn(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
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
  await expect(
    page
      .getByRole('heading', { name: 'Dashboard' })
      .or(page.getByRole('button', { name: 'Home' }))
      .or(page.getByRole('button', { name: 'Dashboard' }))
      .first(),
  ).toBeVisible({ timeout: 30_000 });
}

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
}

async function stubEmptyCatalog(page: Page) {
  await page.route('**/rest/v1/inventory_item_definitions*', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, []);
      return;
    }
    await route.fallback();
  });
}

async function openItemsTab(page: Page) {
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'Items' }).click();
  await expect(
    page.locator('[data-item-library-browser]').filter({ visible: true }).first(),
  ).toBeVisible({ timeout: 20_000 });
}

async function openNewCharacterInventory(page: Page) {
  const createViaEmptyState = page.getByRole('button', { name: 'Charakter erstellen' });
  if (await createViaEmptyState.count()) {
    await createViaEmptyState.first().click();
  } else {
    await page.getByRole('heading', { name: 'Neuer Charakter' }).first().click();
  }
  await expect(page.getByRole('heading', { name: 'Charakter erstellen' })).toBeVisible();
  await page.getByRole('button', { name: /Eigenen Charakter erstellen/i }).click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('tab', { name: /Inventar/i }).click();
  await expect(page.locator('[data-character-inventory-v2]')).toBeVisible({ timeout: 15_000 });
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow).toBe(false);
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('Item Epic hop: Library Items → Workbench visible → Inventory add labels', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await stubEmptyCatalog(page);
  await ensureLoggedIn(page);

  // 1 · Library Items (desktop)
  await page.setViewportSize({ width: 1440, height: 900 });
  await openItemsTab(page);
  await expect(page.getByText(/\d+ Gegenstand/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Neues Item erstellen' })).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-library-items.png'),
    fullPage: true,
  });

  // 2 · Workbench create landing
  await page.getByRole('button', { name: 'Neues Item erstellen' }).click();
  await expect(page).toHaveURL(/\/items\/create$/);
  await expect(page.locator('[data-item-workbench]').first()).toBeVisible({ timeout: 20_000 });
  await expect(
    page
      .locator('[data-item-workbench-landing]')
      .or(page.getByText(/Klicke hier, um ein Item zu erstellen/i))
      .first(),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-workbench.png'),
    fullPage: true,
  });

  // 3 · Character Inventory add-catalog (Core / Eigen always; Standard/Welt when world)
  await page.goto('/');
  await openNewCharacterInventory(page);
  await page.getByRole('button', { name: /Gegenstand hinzufügen/i }).first().click();
  const catalog = page.locator('[data-inventory-catalog-dialog]');
  await expect(catalog).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Core$/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^(Eigene|Eigen)$/i })).toBeVisible();

  // Standard / Welt tabs appear only when effective world exposes them (#143).
  const standardTab = page.getByRole('tab', { name: /^Standard$/i });
  const weltTab = page.getByRole('tab', { name: /^Welt$/i });
  if ((await standardTab.count()) > 0) {
    await expect(standardTab).toBeVisible();
  }
  if ((await weltTab.count()) > 0) {
    await expect(weltTab).toBeVisible();
  }

  // Source filter always lists Core / Standard / Welt / Eigen labels (#143).
  const quelle = page.getByLabel(/^Quelle$/i).or(catalog.getByText(/Alle Quellen|Quelle/i).first());
  if ((await quelle.count()) > 0) {
    await expect(catalog.getByText(/Core|Standard|Welt|Eigen/i).first()).toBeVisible();
  }

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '03-inventory-add.png'),
    fullPage: true,
  });
});

test('Item Epic viewport smoke: 1440 / 768 / 390 no horizontal overflow', async ({ page }) => {
  test.setTimeout(180_000);
  await stubEmptyCatalog(page);
  await ensureLoggedIn(page);

  const viewports = [
    { width: 1440, height: 900, file: 'viewport-1440-library.png' },
    { width: 768, height: 1024, file: 'viewport-768-library.png' },
    { width: 390, height: 844, file: 'viewport-390-library.png' },
  ] as const;

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await openItemsTab(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, vp.file),
      fullPage: true,
    });
  }

  // Inventory add on mobile: open editor at phone width (avoid desktop→mobile host swap).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await openNewCharacterInventory(page);
  await expect(
    page.locator('[data-character-inventory-v2]').filter({ visible: true }).first(),
  ).toBeVisible({ timeout: 15_000 });
  await assertNoHorizontalOverflow(page);
  await page.getByRole('button', { name: /Gegenstand hinzufügen/i }).first().click();
  await expect(
    page.locator('[data-inventory-catalog-dialog]').filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Core$/i })).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, 'viewport-390-inventory-add.png'),
    fullPage: true,
  });
});
