/**
 * Library GM Teilnehmen — preserve adventure + join intent; player join → player surface (#474).
 * Location: e2e/library-adventure-teilnehmen.spec.ts
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLoggedIn } from './helpers/auth';

const EVIDENCE_DIR = '.qa/evidence/library-adventure-teilnehmen';

const LOCAL_ADMIN_USER_ID = '00000000-0000-4000-8000-000000000001';
/** Must NOT be the seeded Local Admin — auth bootstrap scrubs that JWT after timeout/fallback. */
const JOIN_USER_ID = '11111111-1111-4111-8111-111111111111';

const MOCK_PROJECT = {
  id: 'proj-teilnehmen-1',
  public_id: 'SA-K7M4Q',
  code: 'ABCD12',
  name: 'Teilnehmen Regression Saga',
  description: 'Intent-preserving join.',
  world_id: null,
  gm_user_id: LOCAL_ADMIN_USER_ID,
  status: 'active' as const,
  created_at: '2026-08-28T10:00:00.000Z',
  updated_at: '2026-08-28T10:00:00.000Z',
};

const JOINED_SESSION = {
  id: 'sess-teilnehmen-1',
  code: 'JOIN42',
  name: 'Live Join Session',
  project_id: MOCK_PROJECT.id,
  public_id: 'SE-X4K73',
  status: 'waiting',
  created_at: '2026-08-28T11:00:00.000Z',
  updated_at: '2026-08-28T11:00:00.000Z',
  started_at: null,
  ended_at: null,
};

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
}

async function stubLibraryProjects(page: Page) {
  await page.route('**/rest/v1/projects*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, [MOCK_PROJECT]);
  });

  await page.route('**/rest/v1/project_members*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, [
      {
        id: 'm-1',
        project_id: MOCK_PROJECT.id,
        user_id: LOCAL_ADMIN_USER_ID,
        character_id: null,
        role: 'gm',
        status: 'active',
        joined_at: '2026-08-28T10:00:00.000Z',
      },
    ]);
  });

  await page.route('**/rest/v1/sessions*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, []);
  });

  await page.route('**/rest/v1/session_players*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, []);
  });
}

/**
 * Plant a non-admin GoTrue session so joinSession's getUser() succeeds under
 * Local Admin offline fallback (seeded-admin JWTs are intentionally scrubbed).
 */
async function plantAuthSessionForJoin(page: Page) {
  await page.route('**/auth/v1/user**', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, {
        id: JOIN_USER_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'player-e2e@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      });
      return;
    }
    await route.fallback();
  });

  // Block password re-login so bootstrap keeps the planted session path.
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'e2e_block_password_login', error_description: 'blocked' }),
    });
  });

  const wroteKey = await page.evaluate((userId) => {
    // Drop Local Admin offline flag so bootstrap trusts the planted GoTrue session.
    localStorage.removeItem('sagadrive-local-admin-session');

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const payload = btoa(
      JSON.stringify({
        sub: userId,
        role: 'authenticated',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: 'player-e2e@example.com',
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const accessToken = `${header}.${payload}.e2e-sig`;

    const session = {
      access_token: accessToken,
      refresh_token: 'e2e-fake-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'player-e2e@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    };
    const key = 'sb-localhost-auth-token';
    for (let i = 0; i < localStorage.length; i += 1) {
      const existing = localStorage.key(i);
      if (existing && existing.includes('auth-token')) {
        localStorage.setItem(existing, JSON.stringify(session));
        return existing;
      }
    }
    localStorage.setItem(key, JSON.stringify(session));
    return key;
  }, JOIN_USER_ID);

  expect(wroteKey).toBeTruthy();
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('GM Teilnehmen keeps adventure id + join intent on session-join', async ({ page }) => {
  test.setTimeout(90_000);

  await stubLibraryProjects(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'Abenteuer' }).first().click();
  await expect(page.getByText('Teilnehmen Regression Saga').first()).toBeVisible();

  await page.getByRole('button', { name: /Teilnehmen/i }).first().click();

  await expect(page).toHaveURL(/\/session-join\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get('project_id')).toBe(MOCK_PROJECT.id);
  expect(url.searchParams.get('saga')).toBe(MOCK_PROJECT.public_id);
  expect(url.searchParams.get('intent')).toBe('join');

  await expect(page.getByRole('tab', { name: /Session beitreten|Beitreten/i })).toHaveAttribute(
    'data-state',
    'active',
  );

  // Create tab holds the adventure select — switch briefly to assert preselection.
  await page.getByRole('tab', { name: /Session erstellen|Erstellen/i }).click();
  await expect(page.locator('[data-session-join-project]')).toHaveValue(MOCK_PROJECT.id);
  await page.getByRole('tab', { name: /Session beitreten|Beitreten/i }).click();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '01-teilnehmen-join-intent.png'),
    fullPage: true,
  });
});

test('successful player join routes to live player surface (not gamemaster)', async ({ page }) => {
  test.setTimeout(90_000);

  await stubLibraryProjects(page);

  await page.route('**/rest/v1/rpc/join_session_by_code**', async (route) => {
    await json(route, JOINED_SESSION);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);
  await plantAuthSessionForJoin(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Dashboard' }).or(page.getByRole('button', { name: 'Home' })).first(),
  ).toBeVisible({ timeout: 30_000 });

  await expect
    .poll(async () =>
      page.evaluate(() => Object.keys(localStorage).some((k) => k.includes('auth-token'))),
    )
    .toBe(true);

  await page.goto(
    `/session-join?project_id=${MOCK_PROJECT.id}&saga=${MOCK_PROJECT.public_id}&intent=join`,
  );
  await expect(page.getByRole('tab', { name: /Session beitreten|Beitreten/i })).toHaveAttribute(
    'data-state',
    'active',
  );

  await page.getByPlaceholder('z.B. ABC123').fill(JOINED_SESSION.code);
  await page.getByRole('button', { name: 'Als Spieler beitreten' }).click();

  await expect(page).toHaveURL(
    /\/sagas\/SA-K7M4Q\/sessions\/SE-X4K73\/live\/player(?:\/|$|\?)/,
    { timeout: 20_000 },
  );
  expect(page.url()).not.toMatch(/gamemaster/);
  await expect(page.locator('[data-player-panel="v1"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Live Spieler/i).first()).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE_DIR, '02-player-join-surface.png'),
    fullPage: true,
  });
});
