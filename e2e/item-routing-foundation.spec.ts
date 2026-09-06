import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/item-routing-foundation';

async function ensureLoggedIn(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }
  await expect(page.getByRole('button', { name: 'Dashboard' }).first()).toBeVisible({
    timeout: 15_000,
  });
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('library URL is reload-stable', async ({ page }) => {
  await ensureLoggedIn(page);
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page).toHaveURL(/\/library$/);
  await page.reload();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole('button', { name: 'Bibliothek' }).first()).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-library-route.png'),
    fullPage: true,
  });
});

test('item create and detail placeholders are addressable', async ({ page }) => {
  await ensureLoggedIn(page);
  await page.goto('/items/create');
  await expect(page.getByRole('heading', { name: 'Neues Item' })).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-items-create-placeholder.png'),
    fullPage: true,
  });

  await page.goto('/items/demo-item');
  await expect(page.getByRole('heading', { name: 'Item' })).toBeVisible();
  await expect(page.getByRole('code')).toContainText('/items/demo-item');

  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeVisible();
  await page.getByRole('button', { name: 'Zum Dashboard' }).click();
  await expect(page).toHaveURL(/\/$/);
});
