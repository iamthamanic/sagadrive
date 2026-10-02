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
  switchSpeciesGender,
} from './helpers/character-editor';

const EVIDENCE = '.qa/evidence/liveact-face-setup-e2e';
const PUBLIC_SPECIES = path.join('public', 'assets', 'avatars', 'species');

/** LIVEACT_MIRROR_AVATAR=true: L/R face channels swap on the applied path. */
const MIRRORED_FACE: Readonly<Record<string, string>> = {
  eyeBlinkLeft: 'eyeBlinkRight',
  eyeBlinkRight: 'eyeBlinkLeft',
  mouthSmileLeft: 'mouthSmileRight',
  mouthSmileRight: 'mouthSmileLeft',
};

type AppliedSignal = { status: string; value: number | null };

type LiveActE2eApi = {
  ingestSample: (sample: Record<string, unknown>, timestampMs?: number) => unknown;
  getDiagnosticsV2: () => {
    trackingLost: boolean;
    stages: {
      raw: Record<string, number | null>;
      retargeted: Record<string, number | null>;
      applied: Record<string, AppliedSignal>;
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

async function requireWebGl(page: Page) {
  // Prefer ready runtime (hint gone) — WebGL attribute alone can race model load.
  const hint = page.getByTestId('avatar-preview-runtime-hint');
  const webglSurface = page.locator('[data-avatar-use-webgl="true"]').first();
  await Promise.race([
    webglSurface.waitFor({ state: 'visible', timeout: 45_000 }).catch(() => null),
    hint.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => null),
  ]);
  const hasWebGl =
    (await webglSurface.isVisible().catch(() => false)) ||
    !(await hint.isVisible().catch(() => false));
  if (!hasWebGl) {
    await page.screenshot({ path: path.join(EVIDENCE, '00-no-webgl.png'), fullPage: true });
    await expect(page.getByTestId('liveact-tracking-toggle')).toBeVisible();
  }
  // Match liveact-face-fidelity / viewport-smoke: GPU-less runners skip the 3D path.
  // Domain RAW→APPLIED remains gated by scripts/liveact-face-setup-e2e-check.mjs in test-gate.
  test.skip(!hasWebGl, 'WebGL avatar surface required for #424 Face Setup / LiveAct browser path');
}

test.use({
  contextOptions: {
    permissions: ['camera'],
  },
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--enable-unsafe-swiftshader',
    ],
  },
});

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
});

test('Face Setup: open, cancel, apply, tracking lifecycle + RAW→APPLIED inject', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    (window as Window & { __SAGA_ENABLE_LIVEACT_E2E__?: boolean }).__SAGA_ENABLE_LIVEACT_E2E__ = true;
  });
  await openBlankCharacterEditor(page);
  await completeSpeciesBasics(page, 'female');

  await openAvatarPreviewLiveActSettings(page);
  await requireWebGl(page);

  // --- Face Setup open + Cancel ---
  await openFaceMappingFromGear(page);
  await expect(page.getByTestId('face-mapping-auto')).toBeVisible();
  await expect(page.getByTestId('face-mapping-marker-mouthUpper')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE, '01-face-mapping-open.png'), fullPage: true });

  const cancelBtn = page.getByTestId('face-mapping-cancel').or(page.getByTestId('face-mapping-viewport-cancel'));
  await expect(cancelBtn.first()).toBeVisible();
  await cancelBtn.first().click();
  await expect(page.getByTestId('face-mapping-authoring-panel')).toHaveCount(0);

  // --- Face Setup open + Apply (sidecar baseline must make Speichern enabled) ---
  await openFaceMappingFromGear(page);
  const saveBtn = page.getByTestId('face-mapping-viewport-save');
  await expect(saveBtn).toBeEnabled({ timeout: 60_000 });
  await saveBtn.click();
  await expect(page.getByTestId('face-mapping-authoring-panel')).toHaveCount(0);

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

  const matrix: Record<string, unknown> = {};
  for (const ch of channels) {
    const expectedApplied = MIRRORED_FACE[ch] ?? ch;
    const opposite =
      ch === 'eyeBlinkLeft' || ch === 'eyeBlinkRight' || ch === 'mouthSmileLeft' || ch === 'mouthSmileRight'
        ? MIRRORED_FACE[expectedApplied] ?? ch
        : null;
    const result = await page.evaluate(
      ({ channel, expectedAppliedChannel, oppositeChannel, sample }) => {
        const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
        if (!api) return { ok: false, reason: 'no_api' };
        api.ingestSample(sample);
        const d2 = api.getDiagnosticsV2();
        if (!d2 || d2.trackingLost) return { ok: false, reason: 'lost', d2 };
        const rawKey = `face.${channel}`;
        const appliedKey = `face.${expectedAppliedChannel}`;
        const raw = d2.stages.raw[rawKey];
        const applied = d2.stages.applied[appliedKey];
        const opp =
          oppositeChannel != null ? d2.stages.applied[`face.${oppositeChannel}`] : null;
        const appliedOk =
          applied?.status === 'ok' && typeof applied.value === 'number' && applied.value > 0.4;
        const oppositeQuiet =
          oppositeChannel == null ||
          opp == null ||
          opp.status !== 'ok' ||
          typeof opp.value !== 'number' ||
          opp.value < 0.25;
        return {
          ok: typeof raw === 'number' && raw > 0.5 && appliedOk && oppositeQuiet,
          raw,
          appliedStatus: applied?.status ?? null,
          appliedValue: applied?.value ?? null,
          oppositeValue: opp?.value ?? null,
        };
      },
      {
        channel: ch,
        expectedAppliedChannel: expectedApplied,
        oppositeChannel: opposite,
        sample: fixtureSample({ [ch]: 0.7 }),
      },
    );
    matrix[ch] = result;
    expect(result.ok, `${ch} RAW→APPLIED ${JSON.stringify(result)}`).toBe(true);
  }

  // Head / gaze inject — assert APPLIED pose/gaze when available, else retargeted fallback for unsupported
  const pose = await page.evaluate((sample) => {
    const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
    if (!api) return { ok: false };
    api.ingestSample(sample);
    const d2 = api.getDiagnosticsV2();
    if (!d2) return { ok: false };
    const yawApplied = d2.stages.applied['head.yaw'];
    const pitchApplied = d2.stages.applied['head.pitch'];
    const gazeApplied = d2.stages.applied['eyeLeft.x'];
    const yaw =
      yawApplied?.status === 'ok' && typeof yawApplied.value === 'number'
        ? yawApplied.value
        : d2.stages.retargeted['head.yaw'];
    const pitch =
      pitchApplied?.status === 'ok' && typeof pitchApplied.value === 'number'
        ? pitchApplied.value
        : d2.stages.retargeted['head.pitch'];
    const gazeX =
      gazeApplied?.status === 'ok' && typeof gazeApplied.value === 'number'
        ? gazeApplied.value
        : d2.stages.retargeted['eyeLeft.x'];
    return { ok: true, yaw, pitch, gazeX };
  }, fixtureSample({}, { yaw: 0.35, pitch: -0.25, lx: 0.45, ly: 0, rx: 0.4, ry: 0 }));
  expect(pose.ok).toBe(true);
  expect(Math.abs(Number(pose.yaw))).toBeGreaterThan(0.05);
  expect(Math.abs(Number(pose.pitch))).toBeGreaterThan(0.05);

  // Lost / reacquire — neutralize then resume jaw on mirrored/applied path
  const lost = await page.evaluate(() => {
    const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
    if (!api) return { ok: false };
    api.ingestSample({
      presence: 1,
      headYaw: 0,
      headPitch: 0,
      headRoll: 0,
      eyeLeftX: 0,
      eyeLeftY: 0,
      eyeRightX: 0,
      eyeRightY: 0,
      face: { jawOpen: 0.7 },
      faceIndex: 0,
      faceCount: 1,
    });
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
    const jawLost = lostSnap?.stages.applied['face.jawOpen'];
    const blinkLost = lostSnap?.stages.applied['face.eyeBlinkLeft'];
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
    const jawBack = back?.stages.applied['face.jawOpen'];
    const jawNeutral =
      !jawLost ||
      jawLost.status !== 'ok' ||
      jawLost.value == null ||
      Math.abs(jawLost.value) < 0.15;
    const blinkNeutral =
      !blinkLost ||
      blinkLost.status !== 'ok' ||
      blinkLost.value == null ||
      Math.abs(blinkLost.value) < 0.15;
    const jawResumed =
      jawBack?.status === 'ok' && typeof jawBack.value === 'number' && jawBack.value > 0.35;
    return {
      ok: Boolean(lostSnap?.trackingLost) && Boolean(back && !back.trackingLost) && jawNeutral && blinkNeutral && jawResumed,
      lost: lostSnap?.trackingLost,
      jawLostValue: jawLost?.value ?? null,
      blinkLostValue: blinkLost?.value ?? null,
      jawBack: jawBack?.value ?? null,
    };
  });
  expect(lost.ok, JSON.stringify(lost)).toBe(true);

  // Model swap: female → male while LiveAct session active
  await switchSpeciesGender(page, 'male');
  await openAvatarPreviewLiveActSettings(page);
  await expect(page.locator('[data-avatar-use-webgl="true"]').first()).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(async () => Boolean(await getE2eApi(page)), { timeout: 45_000 })
    .toBe(true);
  const postSwap = await page.evaluate((sample) => {
    const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
    if (!api) return { ok: false, reason: 'no_api' };
    api.ingestSample(sample);
    const d2 = api.getDiagnosticsV2();
    const applied = d2?.stages.applied['face.jawOpen'];
    return {
      ok: d2 != null && !d2.trackingLost && applied?.status === 'ok' && typeof applied.value === 'number' && applied.value > 0.4,
      applied: applied?.value ?? null,
    };
  }, fixtureSample({ jawOpen: 0.7 }));
  expect(postSwap.ok, `model swap m5 ${JSON.stringify(postSwap)}`).toBe(true);

  // Stop tracking
  await trackingToggle.click();
  await expect(page.getByTestId('liveact-status-block')).toBeVisible();

  // Narrow viewport smoke
  await page.setViewportSize({ width: 390, height: 844 });
  await openAvatarPreviewLiveActSettings(page);
  await expect(page.getByTestId('liveact-tracking-toggle')).toBeVisible();

  fs.writeFileSync(
    path.join(EVIDENCE, 'functional-matrix.json'),
    `${JSON.stringify({ matrix, pose, lost, postSwap }, null, 2)}\n`,
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
  await requireWebGl(page);
  await openFaceMappingFromGear(page);
  await expect(page.getByTestId('face-mapping-authoring-panel')).toBeVisible();
  await expect(page.getByTestId('face-mapping-auto')).toBeVisible();
  const saveBtn = page.getByTestId('face-mapping-viewport-save');
  await expect(saveBtn).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('face-mapping-cancel').or(page.getByTestId('face-mapping-viewport-cancel')).first().click();
  await page.screenshot({ path: path.join(EVIDENCE, '03-male-face-mapping.png'), fullPage: true });
});

test('Generic GLB fallback: species GLB body serves as glTF runtime path', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const glbPath = path.join(PUBLIC_SPECIES, 'human-female-quality-20260921-f5.glb');
  expect(fs.existsSync(glbPath), 'f5 generic GLB present').toBe(true);
  const glbBytes = fs.readFileSync(glbPath);
  // Serve GLB bytes at the face3 VRM URL so the loader takes the non-VRM glTF branch (contractual fallback).
  await page.route('**/human-female-quality-20260921-f5-face3.vrm**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'model/gltf-binary',
      body: glbBytes,
    });
  });
  await page.addInitScript(() => {
    (window as Window & { __SAGA_ENABLE_LIVEACT_E2E__?: boolean }).__SAGA_ENABLE_LIVEACT_E2E__ = true;
  });
  await openBlankCharacterEditor(page);
  await completeSpeciesBasics(page, 'female');
  await openAvatarPreviewLiveActSettings(page);
  await requireWebGl(page);
  const trackingToggle = page.getByTestId('liveact-tracking-toggle');
  await expect(trackingToggle).toBeEnabled({ timeout: 60_000 });
  await trackingToggle.click();
  await expect
    .poll(async () => Boolean(await getE2eApi(page)), { timeout: 30_000 })
    .toBe(true);
  const glbRuntime = await page.evaluate((sample) => {
    const api = (window as unknown as { __SAGA_LIVEACT_E2E__?: LiveActE2eApi }).__SAGA_LIVEACT_E2E__;
    if (!api) return { ok: false, reason: 'no_api' };
    api.ingestSample(sample);
    const d2 = api.getDiagnosticsV2();
    if (!d2 || d2.trackingLost) return { ok: false, reason: 'lost' };
    const jaw = d2.stages.applied['face.jawOpen'];
    // Supported morphs apply; missing optional channels may be unavailable — jaw is core when present.
    const jawOk =
      jaw == null ||
      jaw.status === 'unavailable' ||
      (jaw.status === 'ok' && typeof jaw.value === 'number' && jaw.value > 0.2);
    return { ok: jawOk, jawStatus: jaw?.status ?? null, jawValue: jaw?.value ?? null };
  }, fixtureSample({ jawOpen: 0.7 }));
  expect(glbRuntime.ok, `generic GLB runtime ${JSON.stringify(glbRuntime)}`).toBe(true);
  await page.screenshot({ path: path.join(EVIDENCE, '04-generic-glb.png'), fullPage: true });
});
