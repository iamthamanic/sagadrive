import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * E2E: NPC/creature Quick Create + Editor live Statblock (#198).
 * Location: e2e/npc-creature-creator-editor.spec.ts
 */

const EVIDENCE_DIR = '.qa/evidence/npc-creature-creator-editor';

const SAMPLE_ID = 'personal:cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const samplePayload = {
  name: 'Waldwächter',
  description: 'Ein stiller Hüter',
  kind: 'npc',
  category: 'npc',
  sheetMode: 'compact',
  level: 5,
  combatProfile: 'balanced',
  combatRole: 'standard',
  tags: ['wald'],
  payloadVersion: 1,
};

function makeRow(payload: Record<string, unknown> = samplePayload) {
  return {
    id: SAMPLE_ID,
    scope: 'personal',
    world_profile_id: null,
    owner_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    payload,
    status: 'active',
    payload_version: 1,
    created_at: '2026-09-14T00:00:00Z',
    updated_at: '2026-09-14T00:00:00Z',
  };
}

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

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('quick create flow + desktop live preview + mobile Vorschau', async ({ page }) => {
  test.setTimeout(120_000);

  let stored = makeRow();
  let created = false;

  await page.route('**/rest/v1/npc_creature_definitions*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'GET') {
      // Detail fetch includes id=eq.<definitionId>; list does not.
      if (url.includes('id=eq.')) {
        await json(route, created ? [stored] : []);
        return;
      }
      await json(route, created ? [stored] : []);
      return;
    }

    if (method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown> | Record<string, unknown>[];
      const row = Array.isArray(body) ? body[0] : body;
      const payload = (row?.payload ?? samplePayload) as Record<string, unknown>;
      stored = makeRow({
        ...samplePayload,
        ...payload,
        name: typeof payload.name === 'string' ? payload.name : 'Waldwächter',
      });
      // Honor client-provided id when present (repository generates personal:<uuid>).
      if (typeof row?.id === 'string' && row.id.length > 0) {
        stored = { ...stored, id: row.id };
      }
      created = true;
      await json(route, stored, 201);
      return;
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const payload = (body?.payload ?? stored.payload) as Record<string, unknown>;
      stored = makeRow({
        ...samplePayload,
        ...payload,
        name: typeof payload.name === 'string' ? payload.name : 'Waldwächter',
      });
      stored = { ...stored, id: typeof body?.id === 'string' ? body.id : stored.id };
      await json(route, stored);
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

  // Core/Pack locals are always listed (#199); use header create CTA.
  await page.locator('[data-npc-library-create]').click();
  await expect(page.locator('[data-npc-create-screen]')).toBeVisible();

  await page.locator('[data-npc-create-kind="npc"]').click();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-create-step-kind.png'),
    fullPage: true,
  });

  await page.locator('[data-npc-create-next]').click();
  await expect(page.getByText('Schnell erstellen').first()).toBeVisible();
  await page.locator('[data-npc-create-quick-continue]').click();
  await expect(page.locator('[data-npc-quick-create]')).toBeVisible();
  await page.locator('[data-npc-create-name]').fill('Waldwächter');
  await expect(page.locator('[data-npc-create-machtgrad]')).toContainText('Machtgrad');

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-quick-create-form.png'),
    fullPage: true,
  });

  await page.locator('[data-npc-create-submit]').click();
  await expect(page.locator('[data-npc-editor-screen]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-npc-editor-preview]')).toBeVisible();
  await expect(page.locator('[data-npc-editor-preview]')).toContainText('Gesundheit');
  await expect(page.getByRole('tab', { name: 'Grundlagen' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Werte' })).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '03-editor-desktop-live.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-npc-editor-mobile-preview]')).toBeVisible();
  await page.locator('[data-npc-editor-mobile-preview]').click();
  await expect(page.locator('[data-npc-editor-preview]')).toBeVisible();
  await expect(page.locator('[data-npc-statblock-panel]')).toContainText('Gesundheit');

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '04-editor-mobile-preview.png'),
    fullPage: true,
  });
});
