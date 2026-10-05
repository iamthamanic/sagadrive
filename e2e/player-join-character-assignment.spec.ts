/**
 * player-join-character-assignment — Playwright smoke for #478.
 * Location: e2e/player-join-character-assignment.spec.ts
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { ensureLoggedIn } from './helpers/auth';

const LOCAL_ADMIN_USER_ID = '00000000-0000-4000-8000-000000000001';

const MOCK_CHARACTER = {
  id: 'char-join-1',
  public_id: 'CH-JOIN1',
  owner_user_id: LOCAL_ADMIN_USER_ID,
  name: 'Join Hero',
  description: null,
  class: 'Wanderer',
  race: 'Mensch',
  ruleset_key: 'sagadrive-core',
  level: 1,
  portrait_url: null,
  sheet_status: 'ready',
  created_at: '2026-08-28T10:00:00.000Z',
  updated_at: '2026-08-28T10:00:00.000Z',
};

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
}

async function stubAssignableCharacters(page: Page) {
  await page.route('**/rest/v1/characters*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, [MOCK_CHARACTER]);
  });
}

test.describe('player join character assignment (#478)', () => {
  test('session-join join tab exposes character assignment surface', async ({ page }) => {
    test.setTimeout(60_000);
    await stubAssignableCharacters(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureLoggedIn(page);

    await page.goto('/session-join?intent=join&saga=SA-TEST1');
    await expect(page.getByRole('tab', { name: /Session beitreten|Beitreten/i })).toHaveAttribute(
      'data-state',
      'active',
    );
    await expect(page.locator('[data-character-assignment="v1"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-join-with-character]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Mit .+ beitreten/i })).toBeVisible();
  });

  test('player-resolve route mounts without crash', async ({ page }) => {
    await page.goto('/sagas/SA-TEST1/sessions/SE-TEST1/live/player');
    await expect(page.locator('body')).toBeVisible();
  });
});
