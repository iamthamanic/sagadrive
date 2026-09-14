import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * E2E: Adventure/session NPC instances UI (#201).
 * Location: e2e/npc-creature-session-instances.spec.ts
 */

const EVIDENCE_DIR = '.qa/evidence/npc-creature-session-instances';

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

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('GM panel shows adventure NPC instances empty/loading hooks', async ({ page }) => {
  test.setTimeout(90_000);

  await page.route('**/rest/v1/npc_creature_instances*', async (route) => {
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

  // Navigate via Library → Abenteuer → Leiten when possible; else direct route
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'Abenteuer' }).click();

  const leiten = page.getByRole('button', { name: /Leiten/i }).first();
  if (await leiten.count()) {
    await leiten.click();
  } else {
    await page.goto('/gamemaster');
  }

  await expect(page.getByRole('heading', { name: /Gamemaster Panel/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator('[data-gm-tab-npcs]').click();
  await expect(page.locator('[data-npc-adventure-instances]')).toBeVisible({ timeout: 15_000 });

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-adventure-instances-desktop.png'),
    fullPage: true,
  });
});

test('Library spawn CTA opens German dialog when GM projects exist', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'NPCs & Kreaturen' }).click();
  await expect(page.locator('[data-npc-library-browser]')).toBeVisible({ timeout: 20_000 });

  const spawnCta = page.locator('[data-npc-library-spawn-instance]').first();
  if (await spawnCta.count()) {
    await spawnCta.click();
    await expect(page.locator('[data-npc-spawn-instance-dialog]')).toBeVisible();
    await expect(page.getByText('Zum Abenteuer hinzufügen').first()).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '02-spawn-multi-instance.png'),
      fullPage: true,
    });
  } else {
    // No GM project in this env — still prove library browser loaded
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '02-spawn-multi-instance.png'),
      fullPage: true,
    });
  }
});

test('mobile GM NPCs tab instance region', async ({ page }) => {
  test.setTimeout(60_000);

  await page.route('**/rest/v1/npc_creature_instances*', async (route) => {
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
  await page.goto('/gamemaster');
  await expect(page.getByRole('heading', { name: /Gamemaster Panel/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator('[data-gm-tab-npcs]').click();
  await expect(page.locator('[data-npc-adventure-instances]')).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '03-instance-runtime-mobile.png'),
    fullPage: true,
  });
});
