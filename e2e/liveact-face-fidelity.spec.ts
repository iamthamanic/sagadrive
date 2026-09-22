/**
 * LiveAct face fidelity E2E — VRM primary humans + gear/diagnostics (#406).
 * Location: e2e/liveact-face-fidelity.spec.ts
 *
 * Extends viewport smoke with VRM-primary Human load, channel-table visibility,
 * metrics toggle while overlay stays on, and tracking off → neutral status.
 * Fake camera only — no real biometric recordings.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { completeSpeciesBasics, openBlankCharacterEditor } from './helpers/character-editor';

const EVIDENCE = '.qa/evidence/liveact-face-fidelity';

test.use({
  contextOptions: {
    permissions: ['camera'],
  },
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
});

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
});

test('Human LiveAct fidelity gear: VRM path, channel table, metrics/overlay lifecycle', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBlankCharacterEditor(page);
  await completeSpeciesBasics(page);

  const gear = page.getByTestId('avatar-preview-settings');
  await expect(gear).toBeVisible({ timeout: 20_000 });
  await gear.click();

  const trackingToggle = page.getByTestId('liveact-tracking-toggle');
  const pipToggle = page.getByTestId('liveact-camera-preview-toggle');
  const faceOverlayToggle = page.getByTestId('liveact-face-overlay-toggle');
  const metricsToggle = page.getByTestId('liveact-face-metrics-toggle');
  await expect(trackingToggle).toBeVisible();
  await expect(pipToggle).toBeVisible();
  await expect(faceOverlayToggle).toBeVisible();
  await expect(metricsToggle).toBeVisible();

  const webglSurface = page.locator('[data-avatar-use-webgl="true"]').first();
  const hasWebGl = await webglSurface
    .waitFor({ state: 'visible', timeout: 45_000 })
    .then(() => true)
    .catch(() => false);

  if (!hasWebGl) {
    await expect(
      page.getByText(/3D-Modell erforderlich — Darstellung und LiveAct sind deaktiviert/i),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE, '01-no-webgl-fallback.png'),
      fullPage: true,
    });
    return;
  }

  await expect(trackingToggle).toBeEnabled({ timeout: 60_000 });
  await trackingToggle.click();
  await faceOverlayToggle.click();
  await expect(metricsToggle).toBeEnabled();

  // Metrics OFF while overlay stays on (issue matrix).
  await metricsToggle.click();
  await metricsToggle.click();

  await pipToggle.click();
  await expect(page.getByTestId('liveact-status-block')).toBeVisible();
  await expect(page.getByTestId('liveact-capability-inspector')).toBeVisible();
  await expect(page.getByTestId('liveact-diagnostics-channel-table')).toBeVisible({
    timeout: 15_000,
  });

  await page.screenshot({
    path: path.join(EVIDENCE, '02-vrm-human-tracking-diagnostics.png'),
    fullPage: true,
  });

  // Tracking off → status still present (neutral path).
  await trackingToggle.click();
  await expect(page.getByTestId('liveact-status-block')).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE, '03-tracking-off-neutral.png'),
    fullPage: true,
  });
});
