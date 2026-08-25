import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/smoke';

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('app loads SagaDrive shell', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SagaDrive' }).first()).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-app-loads.png'),
    fullPage: true,
  });

  expect(errors, `Console errors: ${errors.join(', ')}`).toEqual([]);
});

test('desktop nav reaches Bibliothek and Marktplatz', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // Demo auth may already be restored; either login or dashboard is fine.
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }

  await expect(page.getByRole('button', { name: 'Dashboard' }).first()).toBeVisible({
    timeout: 15_000,
  });

  for (const label of ['Bibliothek', 'Marktplatz']) {
    await page.getByRole('button', { name: label }).first().click();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, `02-nav-${label.toLowerCase()}.png`),
      fullPage: true,
    });
  }
});
