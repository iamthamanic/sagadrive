/**
 * Session Lobby Preflight — Phone/Tablet/Desktop AU + surface smoke (#491).
 * Location: e2e/session-lobby-preflight.spec.ts
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

test.describe('Session Lobby Preflight (#491)', () => {
  test('lobby surface AU across contexts', async ({ page }, testInfo) => {
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

    // Media probes must be explicit buttons — not auto-started streams.
    await expect(page.locator('[data-session-lobby-probe-camera]')).toBeVisible();
    await expect(page.locator('[data-session-lobby-probe-mic]')).toBeVisible();
    await expect(page.locator('[data-session-lobby-probe-liveact]')).toBeVisible();
  });
});
