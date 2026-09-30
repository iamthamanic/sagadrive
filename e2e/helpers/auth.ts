/**
 * Shared E2E auth helper — single Login readiness contract for Browser E2E.
 * Location: e2e/helpers/auth.ts
 *
 * Prefer this over local ensureLoggedIn copies. Local Admin (admin/1234) must reach
 * Dashboard via product Local-Admin fallback within AUTH_SESSION_TIMEOUT_MS when
 * GoTrue is slow — do not paper over hangs with longer waits alone.
 */
import { expect, type Page } from '@playwright/test';

export const E2E_LOCAL_ADMIN_USER = 'admin';
export const E2E_LOCAL_ADMIN_PASSWORD = '1234';

/** Shell ready after login: desktop Dashboard or mobile Home. */
export function dashboardReadyLocator(page: Page) {
  return page
    .getByRole('heading', { name: 'Dashboard' })
    .or(page.getByRole('button', { name: 'Home' }))
    .or(page.getByRole('button', { name: 'Dashboard' }))
    .first();
}

/**
 * Demo/local-admin login + wait until the app shell is ready.
 * Default credentials match the Local Admin shortcut (admin/1234).
 */
export async function ensureLoggedIn(
  page: Page,
  options?: {
    user?: string;
    password?: string;
    clearCharacterEditId?: boolean;
    /** CI guard only — Local Admin path must succeed well under this. */
    readyTimeoutMs?: number;
  },
) {
  const user = options?.user ?? E2E_LOCAL_ADMIN_USER;
  const password = options?.password ?? E2E_LOCAL_ADMIN_PASSWORD;
  const readyTimeoutMs = options?.readyTimeoutMs ?? 30_000;

  await page.goto('/');
  if (options?.clearCharacterEditId !== false) {
    await page.evaluate(() => {
      sessionStorage.removeItem('sagadrive:character-edit-id');
    });
  }

  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await loginTab.click();
    await page.getByPlaceholder('admin oder deine@email.de').fill(user);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }

  await expect(dashboardReadyLocator(page)).toBeVisible({ timeout: readyTimeoutMs });
}
