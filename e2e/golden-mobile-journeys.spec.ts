/**
 * Golden Mobile Journeys — Phone/Tablet/Desktop AU reference flows (#484).
 * Location: e2e/golden-mobile-journeys.spec.ts
 *
 * Invoked by `npm run test:e2e:golden-mobile` and by mobile/tablet Playwright projects.
 * #378 may call the same npm script as its Adaptive/Mobile dependency gate.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { ensureLoggedIn, dashboardReadyLocator } from './helpers/auth';
import {
  expectAccessiblePrimaryControls,
  expectMinTouchTargets,
  expectNoHorizontalOverflow,
} from './helpers/adaptive-ui-quality';

const USER_ID = '00000000-0000-4000-8000-000000000001';

/** Valid public-id alphabet bodies (no I/O/0/1). */
const SAGA_PUBLIC_ID = 'SA-K7M4Q';
const SESSION_PUBLIC_ID = 'SE-K7M4Q';
const CHARACTER_PUBLIC_ID = 'CH-K7M4Q';

const MOCK_CHARACTER = {
  id: 'char-golden-1',
  public_id: CHARACTER_PUBLIC_ID,
  owner_user_id: USER_ID,
  name: 'Kara Sturmklinge',
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

async function stubCharacters(page: Page) {
  await page.route('**/rest/v1/characters*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, [MOCK_CHARACTER]);
  });
}

function minTouchPx(projectName: string) {
  return projectName === 'chromium' ? 32 : 44;
}

test.describe('Golden Mobile Journeys (#484)', () => {
  test('login-dashboard: unauthenticated login surface AU', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await expect(page.locator('[data-au-surface="login"]')).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page);
    const loginTab = page.getByRole('tab', { name: 'Login' });
    const loginButton = page.getByRole('button', { name: 'Einloggen' });
    await expect(loginTab).toBeVisible();
    await expectMinTouchTargets([loginTab, loginButton], minTouchPx(testInfo.project.name));
  });

  test('login-dashboard: authenticated dashboard AU', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);
    await expect(page.locator('[data-au-surface="dashboard"]')).toBeVisible({ timeout: 15_000 });
    await expect(dashboardReadyLocator(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectMinTouchTargets(
      [page.getByRole('button', { name: 'Bibliothek' }).first()],
      minTouchPx(testInfo.project.name),
    );
  });

  test('dashboard-character: create entry is touch-reachable', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await stubCharacters(page);
    await ensureLoggedIn(page);
    await expect(page.locator('[data-au-surface="dashboard"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const createCard = page.locator('[data-dashboard-character-create]');
    await expect(createCard).toBeVisible();
    await expectMinTouchTargets([createCard], minTouchPx(testInfo.project.name));
    await createCard.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });

  test('session-join-assignment: adaptive join + character pick', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await stubCharacters(page);
    await ensureLoggedIn(page);
    await page.goto(`/session-join?intent=join&saga=${SAGA_PUBLIC_ID}`);
    await expect(page.locator('[data-au-surface="session-join"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-character-assignment="v1"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-join-with-character]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const joinTab = page.getByRole('tab', { name: /Session beitreten|Beitreten/i });
    const joinButton = page.locator('[data-join-with-character]');
    await expectMinTouchTargets([joinTab, joinButton], minTouchPx(testInfo.project.name));
    await expectAccessiblePrimaryControls(page);
  });

  test('session-lobby-preflight: lobby AU + explicit media probes', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);
    await page.goto(`/sagas/${SAGA_PUBLIC_ID}/sessions/${SESSION_PUBLIC_ID}/lobby`);
    await expect(page.locator('[data-au-surface="session-lobby"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-session-lobby="v1"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const leave = page.getByRole('button', { name: 'Verlassen' });
    await expect(leave).toBeVisible();
    await expectMinTouchTargets([leave], minTouchPx(testInfo.project.name));
    await expect(page.locator('[data-session-lobby-probe-camera]')).toBeVisible();
    await expect(page.locator('[data-session-lobby-probe-mic]')).toBeVisible();
    await expect(page.locator('[data-session-lobby-probe-liveact]')).toBeVisible();
  });

  test('player-live-private: LiveStage + private tabs playable', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);
    await page.goto(
      `/sagas/${SAGA_PUBLIC_ID}/sessions/${SESSION_PUBLIC_ID}/live/player/${CHARACTER_PUBLIC_ID}`,
    );
    await expect(page.locator('[data-player-live-screen="v2"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-au-surface="player-live"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const playTab = page.locator('[data-player-live-tab="play"]');
    await expect(playTab).toBeVisible();
    await expectMinTouchTargets([playTab], minTouchPx(testInfo.project.name));
    await playTab.click();
    await expect(page.locator('[data-player-panel="v1"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-shared-rolls="v1"]')).toBeVisible();
    await expect(page.locator('[data-live-inventory-slot="v1"]')).toBeVisible();

    const phoneRail = page.locator('[data-player-live-rail="mobile"]');
    const desktopRail = page.locator('[data-player-live-rail="desktop"]');
    if (testInfo.project.name === 'mobile-chrome') {
      await expect(phoneRail).toBeVisible();
    } else {
      await expect(desktopRail.or(phoneRail).first()).toBeVisible();
    }
  });
});
