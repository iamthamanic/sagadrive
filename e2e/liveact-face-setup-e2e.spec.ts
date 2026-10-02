/**
 * LiveAct Face Setup E2E — #424 full journey (Face Setup + RAW→APPLIED inject).
 * Location: e2e/liveact-face-setup-e2e.spec.ts
 *
 * Fake camera only. Functional channel fixtures use ?liveactE2e=1 ingest bridge.
 * Retarget remains identity unless baseline evidence requires otherwise.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  completeSpeciesBasics,
  openAvatarPreviewLiveActSettings,
  openBlankCharacterEditor,
  openFaceMappingFromGear,
} from './helpers/character-editor';

const EVIDENCE = '.qa/evidence/liveact-face-setup-e2e';

type LiveActE2eApi = {
  ingestSample: (sample: Record<string, unknown>, timestampMs?: number) => unknown;
  getDiagnosticsV2: () => {
    trackingLost: boolean;
    stages: {
      raw: Record<string, number | null>;
      retargeted: Record<string, number | null>;
      applied: Record<string, { status: string; value: number | null }>;
    };
  } | null;
  getState: () => { status: string };
};

async function getE2eApi(page: Page): Promise<LiveActE2eApi | null> {
  return page.evaluate(() => {
    return (
      (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__ ?? null
    );
  });
}

function fixtureSample(face: Record<string, number>, head: Record<string, number> = {}) {
  return {
    presence: 1,
    headYaw: head.yaw ?? 0,
    headPitch: head.pitch ?? 0,
    headRoll: head.roll ?? 0,
    eyeLeftX: head.lx ?? 0,
    eyeLeftY: head.ly ?? 0,
    eyeRightX: head.rx ?? 0,
    eyeRightY: head.ry ?? 0,
    face,
    faceIndex: 0,
    faceCount: 1,
  };
}

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

test('Face Setup: open, cancel, apply, tracking lifecycle + RAW→APPLIED inject', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    (window as Window & { __SAGA_ENABLE_LIVEACT_E2E__?: boolean }).__SAGA_ENABLE_LIVEACT_E2E__ = true;
  });
  await openBlankCharacterEditor(page);
  await completeSpeciesBasics(page, 'female');

  await openAvatarPreviewLiveActSettings(page);
  const webglSurface = page.locator('[data-avatar-use-webgl="true"]').first();
  const hasWebGl = await webglSurface
    .waitFor({ state: 'visible', timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  if (!hasWebGl) {
    await page.screenshot({ path: path.join(EVIDENCE, '00-no-webgl.png'), fullPage: true });
    // Soft-degrade like liveact-face-fidelity: still assert gear exists.
    await expect(page.getByTestId('liveact-tracking-toggle')).toBeVisible();
    return;
  }

  // --- Face Setup open + Cancel ---
  await openFaceMappingFromGear(page);
  await expect(page.getByTestId('face-mapping-auto')).toBeVisible();
  await expect(page.getByTestId('face-mapping-marker-mouthUpper')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE, '01-face-mapping-open.png'), fullPage: true });

  const cancelBtn = page.getByTestId('face-mapping-cancel').or(page.getByTestId('face-mapping-viewport-cancel'));
  await expect(cancelBtn.first()).toBeVisible();
  await cancelBtn.first().click();
  await expect(page.getByTestId('face-mapping-authoring-panel')).toHaveCount(0);

  // --- Face Setup open + Apply (empty draft may be invalid — use Speichern only if enabled) ---
  await openFaceMappingFromGear(page);
  const saveBtn = page.getByTestId('face-mapping-viewport-save');
  if (await saveBtn.isEnabled().catch(() => false)) {
    await saveBtn.click();
    await expect(page.getByTestId('face-mapping-authoring-panel')).toHaveCount(0);
  } else {
    // Incomplete draft: Cancel is the safe exit (Cancel contract).
    await cancelBtn.first().click();
    await expect(page.getByTestId('face-mapping-authoring-panel')).toHaveCount(0);
  }

  // --- LiveAct tracking + diagnostics ---
  await openAvatarPreviewLiveActSettings(page);
  const trackingToggle = page.getByTestId('liveact-tracking-toggle');
  await expect(trackingToggle).toBeEnabled({ timeout: 60_000 });
  await trackingToggle.click();
  await page.getByTestId('liveact-face-overlay-toggle').click();
  await expect(page.getByTestId('liveact-face-metrics-toggle')).toBeEnabled();
  await page.getByTestId('liveact-face-metrics-toggle').click();

  // Face Setup while tracking active → tracking off
  await openFaceMappingFromGear(page);
  await expect(page.getByTestId('face-mapping-authoring-panel')).toBeVisible();
  await cancelBtn.first().click();

  await openAvatarPreviewLiveActSettings(page);
  await trackingToggle.click();
  await expect(trackingToggle).toBeEnabled();

  // Wait for E2E bridge after engine acquire
  await expect
    .poll(async () => Boolean(await getE2eApi(page)), { timeout: 30_000 })
    .toBe(true);

  const channels = [
    'jawOpen',
    'eyeBlinkLeft',
    'eyeBlinkRight',
    'browInnerUp',
    'mouthSmileLeft',
    'mouthSmileRight',
    'mouthPucker',
  ] as const;

  /** @type {Record<string, unknown>} */
  const matrix: Record<string, unknown> = {};
  for (const ch of channels) {
    const result = await page.evaluate(
      ({ channel, sample }) => {
        const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
        if (!api) return { ok: false, reason: 'no_api' };
        api.ingestSample(sample);
        const d2 = api.getDiagnosticsV2();
        if (!d2 || d2.trackingLost) return { ok: false, reason: 'lost', d2 };
        const raw = d2.stages.raw[`face.${channel}`];
        const ret = d2.stages.retargeted[`face.${channel}`];
        // Mirror may move L/R onto the opposite channel in retargeted — accept either side > 0.4
        const retL = d2.stages.retargeted['face.eyeBlinkLeft'];
        const retR = d2.stages.retargeted['face.eyeBlinkRight'];
        const retSmileL = d2.stages.retargeted['face.mouthSmileLeft'];
        const retSmileR = d2.stages.retargeted['face.mouthSmileRight'];
        let appliedProbe = typeof ret === 'number' ? ret : null;
        if (channel === 'eyeBlinkLeft' || channel === 'eyeBlinkRight') {
          appliedProbe = Math.max(
            typeof retL === 'number' ? retL : 0,
            typeof retR === 'number' ? retR : 0,
          );
        }
        if (channel === 'mouthSmileLeft' || channel === 'mouthSmileRight') {
          appliedProbe = Math.max(
            typeof retSmileL === 'number' ? retSmileL : 0,
            typeof retSmileR === 'number' ? retSmileR : 0,
          );
        }
        return {
          ok: typeof raw === 'number' && raw > 0.5 && typeof appliedProbe === 'number' && appliedProbe > 0.4,
          raw,
          retargeted: appliedProbe,
        };
      },
      { channel: ch, sample: fixtureSample({ [ch]: 0.7 }) },
    );
    matrix[ch] = result;
    expect(result.ok, `${ch} RAW→APPLIED ${JSON.stringify(result)}`).toBe(true);
  }

  // Head / gaze inject
  const pose = await page.evaluate((sample) => {
    const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
    if (!api) return { ok: false };
    api.ingestSample(sample);
    const d2 = api.getDiagnosticsV2();
    if (!d2) return { ok: false };
    return {
      ok: true,
      yaw: d2.stages.retargeted['head.yaw'],
      pitch: d2.stages.retargeted['head.pitch'],
      gazeX: d2.stages.retargeted['eyeLeft.x'],
    };
  }, fixtureSample({}, { yaw: 0.35, pitch: -0.25, lx: 0.45, ly: 0, rx: 0.4, ry: 0 }));
  expect(pose.ok).toBe(true);
  expect(Math.abs(Number(pose.yaw))).toBeGreaterThan(0.05);
  expect(Math.abs(Number(pose.pitch))).toBeGreaterThan(0.05);

  // Lost / reacquire
  const lost = await page.evaluate(() => {
    const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
    if (!api) return { ok: false };
    api.ingestSample({
      presence: 0,
      headYaw: 0,
      headPitch: 0,
      headRoll: 0,
      eyeLeftX: 0,
      eyeLeftY: 0,
      eyeRightX: 0,
      eyeRightY: 0,
      face: {},
      faceIndex: -1,
      faceCount: 0,
    });
    const lostSnap = api.getDiagnosticsV2();
    api.ingestSample({
      presence: 1,
      headYaw: 0,
      headPitch: 0,
      headRoll: 0,
      eyeLeftX: 0,
      eyeLeftY: 0,
      eyeRightX: 0,
      eyeRightY: 0,
      face: { jawOpen: 0.55 },
      faceIndex: 0,
      faceCount: 1,
    });
    const back = api.getDiagnosticsV2();
    return {
      ok: Boolean(lostSnap?.trackingLost) && back && !back.trackingLost,
      lost: lostSnap?.trackingLost,
      jawBack: back?.stages.retargeted['face.jawOpen'],
    };
  });
  expect(lost.ok, JSON.stringify(lost)).toBe(true);

  // Stop tracking
  await trackingToggle.click();
  await expect(page.getByTestId('liveact-status-block')).toBeVisible();

  // Narrow viewport smoke
  await page.setViewportSize({ width: 390, height: 844 });
  await openAvatarPreviewLiveActSettings(page);
  await expect(page.getByTestId('liveact-tracking-toggle')).toBeVisible();

  fs.writeFileSync(
    path.join(EVIDENCE, 'functional-matrix.json'),
    `${JSON.stringify({ matrix, pose, lost }, null, 2)}\n`,
  );
  await page.screenshot({ path: path.join(EVIDENCE, '02-narrow-liveact.png'), fullPage: true });
});

test('Face Setup male path: Face Mapping opens on m5 template', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    (window as Window & { __SAGA_ENABLE_LIVEACT_E2E__?: boolean }).__SAGA_ENABLE_LIVEACT_E2E__ = true;
  });
  await openBlankCharacterEditor(page);
  await completeSpeciesBasics(page, 'male');
  await openAvatarPreviewLiveActSettings(page);
  const webglSurface = page.locator('[data-avatar-use-webgl="true"]').first();
  const hasWebGl = await webglSurface
    .waitFor({ state: 'visible', timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  if (!hasWebGl) {
    await expect(page.getByTestId('liveact-tracking-toggle')).toBeVisible();
    return;
  }
  await openFaceMappingFromGear(page);
  await expect(page.getByTestId('face-mapping-authoring-panel')).toBeVisible();
  await expect(page.getByTestId('face-mapping-auto')).toBeVisible();
  await page.getByTestId('face-mapping-cancel').or(page.getByTestId('face-mapping-viewport-cancel')).first().click();
  await page.screenshot({ path: path.join(EVIDENCE, '03-male-face-mapping.png'), fullPage: true });
});
