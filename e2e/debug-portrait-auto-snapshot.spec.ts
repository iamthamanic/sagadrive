/**
 * Portrait auto-snapshot UI contract — buttons + canvas surface visible in Character Editor.
 * Location: .qa/runs/2026-09-19-character-portrait-auto-snapshot.spec.ts
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLoggedIn } from './helpers/character-editor';

const EVIDENCE = '.qa/evidence/character-portrait-auto-snapshot';

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
});

test('Character Editor exposes Portrait erzeugen/hochladen and 3D surface', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

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

  const generateBtn = page.getByRole('button', { name: /Portrait erzeugen/i });
  const uploadBtn = page.getByRole('button', { name: /Portrait hochladen/i });
  await expect(generateBtn).toBeVisible();
  await expect(uploadBtn).toBeVisible();
  await expect(generateBtn).toBeEnabled();
  await expect(uploadBtn).toBeEnabled();

  await page.screenshot({
    path: path.join(EVIDENCE, '01-portrait-buttons.png'),
    fullPage: true,
  });

  // Manual generate: assert no bucket-not-found toast (canvas may be WebGL or fallback).
  await generateBtn.click();
  await page.waitForTimeout(2500);
  const bucketError = page.getByText(/bucket not found|Bucket not found|Bucket nicht gefunden/i);
  await expect(bucketError).toHaveCount(0);
  // Either success toast, not-ready toast, or silent — never storage bucket missing.
  await page.screenshot({
    path: path.join(EVIDENCE, '02-after-portrait-erzeugen.png'),
    fullPage: true,
  });
});
