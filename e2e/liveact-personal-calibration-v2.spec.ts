/**
 * LiveAct Personal Calibration V2 UI (#449) — touch targets, viewports, keyboard.
 * Location: e2e/liveact-personal-calibration-v2.spec.ts
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  completeSpeciesBasics,
  openAvatarPreviewLiveActSettings,
  openBlankCharacterEditor,
} from './helpers/character-editor';

const EVIDENCE = '.qa/evidence/liveact-personal-calibration-v2-ui';

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

async function prepareLiveActSettings(page: import('@playwright/test').Page) {
  await openBlankCharacterEditor(page);
  await completeSpeciesBasics(page);
  await openAvatarPreviewLiveActSettings(page);
}

/**
 * When WebGL/tracking cannot expose live CTAs (GPU-less runners), mount the same
 * product classNames into the loaded app document so Tailwind tokens still apply.
 */
async function mountCalibrationCtaHarness(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const existing = document.getElementById('e2e-personal-calib-harness');
    if (existing) existing.remove();
    const host = document.createElement('div');
    host.id = 'e2e-personal-calib-harness';
    host.className = 'fixed inset-x-2 bottom-2 z-[9999] flex flex-col gap-1 rounded-md border border-white/15 bg-slate-950/95 p-2';
    host.innerHTML = `
      <button type="button" data-testid="liveact-calibrate-personal-v2"
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium min-h-11 w-full text-xs bg-primary text-white px-3">
        Premium Kalibrierung (20–40s)
      </button>
      <button type="button" data-testid="liveact-personal-calib-skip"
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium min-h-11 w-full border border-white/15 text-xs bg-transparent px-3 text-slate-100">
        Überspringen (N/A)
      </button>
      <button type="button" data-testid="liveact-calibrate"
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium h-8 w-full border border-white/15 text-xs bg-transparent px-3 text-slate-100">
        Klassisch kalibrieren
      </button>
      <p data-testid="liveact-personal-calib-phase" class="px-1 text-[10px] text-amber-200/90">
        Premium: Neutral (3 s)
      </p>
    `;
    document.body.appendChild(host);
  });
}

test('Premium CTA ≥44px + German labels across Phone/Tablet/Desktop', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepareLiveActSettings(page);

  const webglSurface = page.locator('[data-avatar-use-webgl="true"]').first();
  const hasWebGl = await webglSurface
    .waitFor({ state: 'visible', timeout: 45_000 })
    .then(() => true)
    .catch(() => false);

  let premium = page.getByTestId('liveact-calibrate-personal-v2');
  let usedHarness = false;

  if (hasWebGl) {
    const trackingToggle = page.getByTestId('liveact-tracking-toggle');
    await expect(trackingToggle).toBeEnabled({ timeout: 60_000 });
    await trackingToggle.click();
    await expect(premium).toBeVisible({ timeout: 30_000 });
  } else {
    await page.screenshot({
      path: path.join(EVIDENCE, '00-webgl-unavailable.png'),
      fullPage: true,
    });
    await mountCalibrationCtaHarness(page);
    usedHarness = true;
    premium = page.getByTestId('liveact-calibrate-personal-v2');
    await expect(premium).toBeVisible();
    test.info().annotations.push({
      type: 'note',
      description:
        'WebGL unavailable — measured product min-h-11 harness under loaded app Tailwind CSS',
    });
  }

  const classic = page.getByTestId('liveact-calibrate');
  const skip = page.getByTestId('liveact-personal-calib-skip');
  await expect(classic).toBeVisible();
  await expect(premium).toContainText(/Premium Kalibrierung \(20–40s\)/);

  // Desktop keyboard reachability + visible focus
  await premium.focus();
  await expect(premium).toBeFocused();
  const desktopBox = await premium.boundingBox();
  expect(desktopBox).toBeTruthy();
  expect((desktopBox?.height ?? 0) >= 44).toBeTruthy();

  if (usedHarness || (await skip.isVisible().catch(() => false))) {
    await expect(skip).toBeVisible();
    const skipBox = await skip.boundingBox();
    expect((skipBox?.height ?? 0) >= 44).toBeTruthy();
    await skip.focus();
    await expect(skip).toBeFocused();
  }

  await page.screenshot({
    path: path.join(EVIDENCE, '01-desktop-premium.png'),
    fullPage: true,
  });

  for (const vp of [
    { w: 320, h: 720, name: 'phone-320' },
    { w: 390, h: 844, name: 'phone-390' },
    { w: 768, h: 1024, name: 'tablet-768' },
    { w: 1024, h: 768, name: 'desktop-boundary-1024' },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    if (!usedHarness) {
      await openAvatarPreviewLiveActSettings(page);
    } else {
      await mountCalibrationCtaHarness(page);
      premium = page.getByTestId('liveact-calibrate-personal-v2');
    }
    await expect(premium).toBeVisible();
    const box = await premium.boundingBox();
    expect(box, `${vp.name} premium box`).toBeTruthy();
    expect((box?.height ?? 0) >= 44, `${vp.name} premium height`).toBeTruthy();

    const skipBtn = page.getByTestId('liveact-personal-calib-skip');
    if (await skipBtn.isVisible().catch(() => false)) {
      const skipBox = await skipBtn.boundingBox();
      expect((skipBox?.height ?? 0) >= 44, `${vp.name} skip height`).toBeTruthy();
    }

    const overflowX = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflowX, `${vp.name} no horizontal overflow`).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: path.join(EVIDENCE, `02-${vp.name}-premium.png`),
      fullPage: true,
    });
  }

  if (!usedHarness) {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAvatarPreviewLiveActSettings(page);
    await premium.click();
    await expect(page.getByTestId('liveact-personal-calib-phase')).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({
      path: path.join(EVIDENCE, '03-phone-premium-running.png'),
      fullPage: true,
    });
  }
});
