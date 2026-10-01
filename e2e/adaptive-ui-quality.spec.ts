/**
 * Adaptive UI quality smokes — Phone/Tablet/Desktop matrix (#483).
 * Location: e2e/adaptive-ui-quality.spec.ts
 *
 * Runs on all Playwright projects. Mobile/tablet projects testMatch this file only
 * (see playwright.config.ts) to avoid multiplying the full suite.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { ensureLoggedIn } from './helpers/auth';
import {
  expectAccessiblePrimaryControls,
  expectMinTouchTargets,
  expectNoHorizontalOverflow,
} from './helpers/adaptive-ui-quality';

const USER_ID = '00000000-0000-4000-8000-000000000001';

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
}

async function mockLibraryApis(page: Page) {
  await page.route('**/rest/v1/projects*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, [
      {
        id: 'proj-1',
        public_id: 'SA-K7M4Q',
        code: 'ABCD12',
        name: 'Das vergessene Königreich',
        description: 'Eine Kampagne um einen versunkenen Thron.',
        world_id: null,
        gm_user_id: USER_ID,
        status: 'active',
        created_at: '2026-08-28T10:00:00.000Z',
        updated_at: '2026-08-28T10:00:00.000Z',
      },
    ]);
  });
  await page.route('**/rest/v1/project_members*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, [
      {
        id: 'm-1',
        project_id: 'proj-1',
        user_id: USER_ID,
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
}

async function openLibraryAdventures(page: Page) {
  await mockLibraryApis(page);
  await ensureLoggedIn(page);
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'Abenteuer' }).first().click();
  await expect(page.getByText('Das vergessene Königreich').first()).toBeVisible();
}

test.describe('Adaptive UI quality gates', () => {
  test('library adventures: no overflow, touch targets, a11y names, visual baseline', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await openLibraryAdventures(page);

    await expectNoHorizontalOverflow(page);

    const primaryActions = [
      page.getByRole('button', { name: 'Bibliothek' }).first(),
      page.getByRole('tab', { name: 'Abenteuer' }).first(),
    ];
    // Phone/Tablet: AU-02 hard gate (≥44). Desktop chromium: denser chrome allowed (≥32).
    const minPx = testInfo.project.name === 'chromium' ? 32 : 44;
    await expectMinTouchTargets(primaryActions, minPx);

    await expectAccessiblePrimaryControls(page);

    await expect(page.locator('body')).toHaveScreenshot('library-adventures.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    });
  });
});
