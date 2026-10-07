/**
 * Session Prepare + Recap — Phone/Tablet/Desktop AU smoke (#492).
 * Location: e2e/session-prepare-recap.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './helpers/auth';
import {
  expectMinTouchTargets,
  expectNoHorizontalOverflow,
} from './helpers/adaptive-ui-quality';

const SAGA_PUBLIC_ID = 'SA-K7M4Q';
const SESSION_PUBLIC_ID = 'SE-K7M4Q';

function minTouchPx(projectName: string) {
  return projectName === 'chromium' ? 32 : 44;
}

test.describe('Session Prepare + Recap (#492)', () => {
  test('prepare surface AU across contexts', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);

    await page.goto(`/sagas/${SAGA_PUBLIC_ID}/sessions/${SESSION_PUBLIC_ID}/prepare`);
    await expect(page.locator('[data-au-surface="session-prepare"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-session-prepare="v1"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const back = page.getByRole('button', { name: 'Zurück' });
    await expect(back).toBeVisible();
    await expectMinTouchTargets([back], minTouchPx(testInfo.project.name));
    await expect(page.locator('[data-session-prepare-primary]')).toBeVisible();
  });

  test('recap surface AU across contexts', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await ensureLoggedIn(page);

    await page.goto(`/sagas/${SAGA_PUBLIC_ID}/sessions/${SESSION_PUBLIC_ID}/recap`);
    await expect(page.locator('[data-au-surface="session-recap"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-session-recap="v1"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const back = page.getByRole('button', { name: 'Zurück' });
    await expect(back).toBeVisible();
    await expectMinTouchTargets([back], minTouchPx(testInfo.project.name));
    await expect(page.locator('[data-session-recap-primary]')).toBeVisible();
    await expect(page.locator('[data-session-recap-highlights]')).toBeVisible();
  });
});
