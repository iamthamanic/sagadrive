/**
 * LiveAct viewport smoke — fake camera + gear toggles (#335).
 * Location: e2e/liveact-viewport-smoke.spec.ts
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { completeSpeciesBasics, openBlankCharacterEditor } from './helpers/character-editor';

const EVIDENCE = '.qa/evidence/liveact-viewport-smoke';

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

test('Character Editor LiveAct gear toggles with fake camera', async ({ page }) => {
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
  const bonesToggle = page.getByTestId('liveact-bones-toggle');
  await expect(trackingToggle).toBeVisible();
  await expect(pipToggle).toBeVisible();
  await expect(faceOverlayToggle).toBeVisible();
  await expect(bonesToggle).toBeVisible();
  await expect(page.getByTestId('liveact-calibrate')).toBeVisible();

  const webglSurface = page.locator('[data-avatar-use-webgl="true"]').first();
  const hasWebGl = await webglSurface
    .waitFor({ state: 'visible', timeout: 45_000 })
    .then(() => true)
    .catch(() => false);

  if (!hasWebGl) {
    await expect(
      page.getByText(/3D-Modell erforderlich — Darstellung und LiveAct sind deaktiviert/i),
    ).toBeVisible();
    await expect(trackingToggle).toBeDisabled();
    await page.screenshot({
      path: path.join(EVIDENCE, '01-liveact-gear-fallback.png'),
      fullPage: true,
    });
    return;
  }

  await expect(trackingToggle).toBeEnabled({ timeout: 60_000 });
  await trackingToggle.click();

  await faceOverlayToggle.click();
  await pipToggle.click();
  await pipToggle.click();

  await expect(page.getByTestId('liveact-status-block')).toBeVisible();

  await page.screenshot({
    path: path.join(EVIDENCE, '01-liveact-gear-3d.png'),
    fullPage: true,
  });

  const pip = page.getByTestId('liveact-camera-pip');
  if (await pip.isVisible()) {
    await page.screenshot({
      path: path.join(EVIDENCE, '02-liveact-pip-visible.png'),
      fullPage: true,
    });
  }

  await trackingToggle.click();
});
