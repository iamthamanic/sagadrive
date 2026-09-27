import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLoggedIn } from './helpers/character-editor';

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
  await ensureLoggedIn(page);

  await expect(page.getByRole('button', { name: 'Dashboard' }).or(page.getByRole('button', { name: 'Home' })).first()).toBeVisible({
    timeout: 30_000,
  });

  for (const label of ['Bibliothek', 'Marktplatz']) {
    await page.getByRole('button', { name: label }).first().click();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, `02-nav-${label.toLowerCase()}.png`),
      fullPage: true,
    });
  }
});
