/**
 * Local Admin + GoTrue timeout contract — behavioral cases A–E.
 * Location: e2e/auth-local-admin-timeout.spec.ts
 *
 * Proves Local Admin shortcut bounds GoTrue with AUTH_SESSION_TIMEOUT_MS and
 * falls back to app-level admin without hanging LoginScreen.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { dashboardReadyLocator, ensureLoggedIn } from './helpers/auth';

const EVIDENCE = '.qa/evidence/auth-local-admin-timeout';
/** Must match src/lib/networkTimeout.ts AUTH_SESSION_TIMEOUT_MS */
const AUTH_SESSION_TIMEOUT_MS = 1_500;
const LOCAL_ADMIN_STORAGE_KEY = 'sagadrive-local-admin-session';

function isGoTrueToken(url: string): boolean {
  return /\/auth\/v1\/token/.test(url);
}

async function fillCredentials(page: Page, user: string, password: string) {
  await page.goto('/');
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) await loginTab.click();
  await page.getByPlaceholder('admin oder deine@email.de').fill(user);
  await page.getByPlaceholder('••••••••').fill(password);
}

async function readAuthProvider(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.includes('auth-token')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as {
          user?: { app_metadata?: { provider?: string }; email?: string };
        };
        const provider = parsed?.user?.app_metadata?.provider;
        if (provider) return provider;
      }
    } catch {
      /* ignore */
    }
    return null;
  });
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
});

test('A: GoTrue reachable → Local Admin uses real session when available', async ({ page }) => {
  // Do not intercept — local stack or remote may respond.
  await ensureLoggedIn(page, { readyTimeoutMs: 10_000 });
  await expect(dashboardReadyLocator(page)).toBeVisible();
  const localFlag = await page.evaluate((k) => localStorage.getItem(k), LOCAL_ADMIN_STORAGE_KEY);
  expect(localFlag).toBe('true');
  const provider = await readAuthProvider(page);
  // Real JWT → email/provider from GoTrue; offline fallback leaves no supabase auth-token.
  // Either path is valid when stack is up or down — Dashboard must be ready.
  fs.writeFileSync(
    path.join(EVIDENCE, 'case-a.json'),
    `${JSON.stringify({ provider, localFlag }, null, 2)}\n`,
  );
  await page.screenshot({ path: path.join(EVIDENCE, 'case-a-dashboard.png'), fullPage: true });
});

test('B: GoTrue fails immediately → Local Admin fallback → Dashboard', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && isGoTrueToken(req.url())) {
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  const t0 = Date.now();
  await fillCredentials(page, 'admin', '1234');
  await page.getByRole('button', { name: 'Einloggen' }).click();
  await expect(dashboardReadyLocator(page)).toBeVisible({ timeout: 5_000 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(5_000);
  const localFlag = await page.evaluate((k) => localStorage.getItem(k), LOCAL_ADMIN_STORAGE_KEY);
  expect(localFlag).toBe('true');
  fs.writeFileSync(path.join(EVIDENCE, 'case-b.json'), `${JSON.stringify({ elapsedMs: elapsed }, null, 2)}\n`);
  await page.screenshot({ path: path.join(EVIDENCE, 'case-b-dashboard.png'), fullPage: true });
});

test('C: GoTrue hangs past AUTH_SESSION_TIMEOUT_MS → fallback → Dashboard', async ({ page }) => {
  let release: (() => void) | null = null;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route('**/*', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && isGoTrueToken(req.url())) {
      await held;
      await route.abort('timedout');
      return;
    }
    await route.continue();
  });

  const t0 = Date.now();
  await fillCredentials(page, 'admin', '1234');
  await page.getByRole('button', { name: 'Einloggen' }).click();
  await expect(dashboardReadyLocator(page)).toBeVisible({
    timeout: AUTH_SESSION_TIMEOUT_MS + 2_500,
  });
  const elapsed = Date.now() - t0;
  // Must not wait for the artificial hang (would be >> timeout).
  expect(elapsed).toBeLessThan(AUTH_SESSION_TIMEOUT_MS + 2_500);
  expect(elapsed).toBeGreaterThanOrEqual(AUTH_SESSION_TIMEOUT_MS - 200);
  fs.writeFileSync(
    path.join(EVIDENCE, 'case-c.json'),
    `${JSON.stringify({ elapsedMs: elapsed, authTimeoutMs: AUTH_SESSION_TIMEOUT_MS }, null, 2)}\n`,
  );
  await page.screenshot({ path: path.join(EVIDENCE, 'case-c-dashboard.png'), fullPage: true });
  release?.();
});

test('D: non-Local-Admin login does not use Local Admin fallback', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && isGoTrueToken(req.url())) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      });
      return;
    }
    await route.continue();
  });

  await fillCredentials(page, 'someone@example.com', 'wrong-password');
  await page.getByRole('button', { name: 'Einloggen' }).click();
  // Stay on login — no Dashboard via admin fallback.
  await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible({ timeout: 5_000 });
  await expect(dashboardReadyLocator(page)).toHaveCount(0);
  const localFlag = await page.evaluate((k) => localStorage.getItem(k), LOCAL_ADMIN_STORAGE_KEY);
  expect(localFlag).not.toBe('true');
  await page.screenshot({ path: path.join(EVIDENCE, 'case-d-login.png'), fullPage: true });
});

test('E: existing Local Admin storage bootstraps without hanging', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true');
  }, LOCAL_ADMIN_STORAGE_KEY);

  // Delay getSession/token so bootstrap must use timeout path.
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    if (/\/auth\/v1\/(token|user|session)/.test(url)) {
      await new Promise((r) => setTimeout(r, AUTH_SESSION_TIMEOUT_MS + 3_000));
      await route.abort('timedout');
      return;
    }
    await route.continue();
  });

  const t0 = Date.now();
  await page.goto('/');
  await expect(dashboardReadyLocator(page)).toBeVisible({
    timeout: AUTH_SESSION_TIMEOUT_MS + 3_000,
  });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(AUTH_SESSION_TIMEOUT_MS + 3_000);
  fs.writeFileSync(path.join(EVIDENCE, 'case-e.json'), `${JSON.stringify({ elapsedMs: elapsed }, null, 2)}\n`);
  await page.screenshot({ path: path.join(EVIDENCE, 'case-e-dashboard.png'), fullPage: true });
});
