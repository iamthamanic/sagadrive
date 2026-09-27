#!/usr/bin/env node
/**
 * saga-human-canonical-v1-pose-sheet — LiveAct pose sheets for the three Human meshes.
 * Location: scripts/saga-human-canonical-v1-pose-sheet.mjs
 *
 * Same LiveAct VRM output + identical LiveActFrameV1 poses for SagaDrive Human, Reference VRM
 * (diagnostic) and Saga Human Canonical V1 (candidate), in headless Chromium (SwiftShader WebGL).
 * Output: .qa/evidence/saga-human-canonical-v1/*.jpg + pose-sheet-report.json (renders only,
 * no camera / user data). Bundle + page live in .qa/runs/ (never committed).
 * --roundtrip: render known poses as unmirrored webcam frames, track them with the app's MediaPipe
 * Face Landmarker + LiveAct sample mapping (conventions, neutral, left/right chain, channel audit,
 * smoothing transfer; see scripts/lib/liveact-tracking-roundtrip-eval.mjs)
 * → .qa/evidence/liveact-tracking-roundtrip/.
 * Usage: node scripts/saga-human-canonical-v1-pose-sheet.mjs [--roundtrip]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import {
  LR_ACTIONS,
  ROUNDTRIP,
  evaluateConventions,
  evaluateLrChain,
  evaluateNeutral,
  summarizeChannelAudit,
  summarizeStageTransfer,
} from './lib/liveact-tracking-roundtrip-eval.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const RUN_DIR = join(root, '.qa/runs/saga-human-canonical-v1-pose-sheet');
const ROUNDTRIP_MODE = process.argv.includes('--roundtrip');
const EVIDENCE_DIR = join(
  root,
  ROUNDTRIP_MODE ? '.qa/evidence/liveact-tracking-roundtrip' : '.qa/evidence/saga-human-canonical-v1',
);
const PUBLIC_DIR = join(root, 'public');
const HARNESS_PREFIX = '/__harness/';

const CANDIDATE_ID = 'saga-human-canonical-v1';
const AVATARS = [
  {
    id: 'sagadrive-human',
    labelDe: 'SagaDrive Human',
    url: '/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm',
  },
  {
    id: 'reference-vrm-arkit52',
    labelDe: 'Reference VRM (Diagnose)',
    url: '/assets/avatars/reference/valid-white-m1-default.vrm',
  },
  {
    id: CANDIDATE_ID,
    labelDe: 'Saga Human Canonical V1\n(Kandidat)',
    url: '/assets/avatars/canonical/saga-human-canonical-v1.vrm',
  },
];

const both = (base, value = 1) => ({ [`${base}Left`]: value, [`${base}Right`]: value });
/** Test matrix: frame values only (head in rad, gaze −1…1, face 0…1) — identical for every avatar. */
const MATRIX = [
  { id: 'neutral', label: 'neutral' },
  { id: 'headYaw', label: 'head yaw +20°', head: { yaw: 0.35 } },
  { id: 'headPitch', label: 'head pitch +15°', head: { pitch: 0.26 } },
  { id: 'headRoll', label: 'head roll +15°', head: { roll: 0.26 } },
  { id: 'gazeLeft', label: 'gaze x+1 (avatar-left)', eyes: { x: 1, y: 0 } },
  { id: 'gazeRight', label: 'gaze x−1 (avatar-right)', eyes: { x: -1, y: 0 } },
  { id: 'gazeUp', label: 'gaze y+1 (up)', eyes: { x: 0, y: 1 } },
  { id: 'gazeDown', label: 'gaze y−1 (down)', eyes: { x: 0, y: -1 } },
  { id: 'blinkLeft', label: 'eyeBlinkLeft', face: { eyeBlinkLeft: 1 } },
  { id: 'blinkRight', label: 'eyeBlinkRight', face: { eyeBlinkRight: 1 } },
  { id: 'blinkBoth', label: 'blink both', face: both('eyeBlink') },
  { id: 'eyeWide', label: 'eyeWide L+R', face: both('eyeWide') },
  { id: 'eyeSquint', label: 'eyeSquint L+R', face: both('eyeSquint') },
  { id: 'browInnerUp', label: 'browInnerUp', face: { browInnerUp: 1 } },
  { id: 'browOuterUp', label: 'browOuterUp L+R', face: both('browOuterUp') },
  { id: 'browDown', label: 'browDown L+R', face: both('browDown') },
  { id: 'jawOpen', label: 'jawOpen', face: { jawOpen: 1 } },
  { id: 'jawLeft', label: 'jawLeft', face: { jawLeft: 1 } },
  { id: 'jawRight', label: 'jawRight', face: { jawRight: 1 } },
  { id: 'jawForward', label: 'jawForward', face: { jawForward: 1 } },
  { id: 'mouthSmile', label: 'mouthSmile L+R', face: both('mouthSmile') },
  { id: 'mouthFrown', label: 'mouthFrown L+R', face: both('mouthFrown') },
  { id: 'mouthFunnel', label: 'mouthFunnel', face: { mouthFunnel: 1 } },
  { id: 'mouthPucker', label: 'mouthPucker', face: { mouthPucker: 1 } },
  { id: 'mouthClose', label: 'mouthClose .5 + jawOpen .5', face: { mouthClose: 0.5, jawOpen: 0.5 } },
  { id: 'mouthRoll', label: 'mouthRoll U+L', face: { mouthRollUpper: 1, mouthRollLower: 1 } },
  { id: 'mouthShrug', label: 'mouthShrug U+L', face: { mouthShrugUpper: 1, mouthShrugLower: 1 } },
  { id: 'mouthPress', label: 'mouthPress L+R', face: both('mouthPress') },
  { id: 'mouthStretch', label: 'mouthStretch L+R', face: both('mouthStretch') },
  { id: 'mouthUpperUp', label: 'mouthUpperUp L+R', face: both('mouthUpperUp') },
  { id: 'mouthLowerDown', label: 'mouthLowerDown L+R', face: both('mouthLowerDown') },
  { id: 'mouthLeft', label: 'mouthLeft', face: { mouthLeft: 1 } },
  { id: 'mouthRight', label: 'mouthRight', face: { mouthRight: 1 } },
  { id: 'cheekPuff', label: 'cheekPuff', face: { cheekPuff: 1 } },
  { id: 'cheekSquint', label: 'cheekSquint L+R', face: both('cheekSquint') },
  { id: 'noseSneer', label: 'noseSneer L+R', face: both('noseSneer') },
  { id: 'tongueOut', label: 'tongueOut (manuell)', manual: { tongueOut: 1 } },
  { id: 'tongueOutOpen', label: 'tongueOut + jawOpen .5', face: { jawOpen: 0.5 }, manual: { tongueOut: 1 } },
];
const SHEET_11 = [
  'neutral',
  'blinkLeft',
  'blinkRight',
  'gazeLeft',
  'gazeUp',
  'jawOpen',
  'mouthSmile',
  'mouthPucker',
  'mouthFunnel',
  'cheekPuff',
  'tongueOut',
];
/** MakeHuman-specific QA views: teeth / tongue / lids / eyeballs up close. */
const CLOSEUPS = [
  { pose: 'neutral', framing: 'mouth', label: 'Mund neutral' },
  { pose: 'jawOpen', framing: 'mouth', label: 'jawOpen: Zähne/Zunge' },
  { pose: 'tongueOutOpen', framing: 'mouth', label: 'tongueOut + jawOpen .5' },
  { pose: 'neutral', framing: 'eyes', label: 'Augen neutral' },
  { pose: 'blinkLeft', framing: 'eyes', label: 'eyeBlinkLeft' },
  { pose: 'gazeLeft', framing: 'eyes', label: 'gaze x+1' },
  { pose: 'gazeUp', framing: 'eyes', label: 'gaze y+1' },
];

/** Lip channels one by one (mouth close-ups): the visible geometry of the lip fidelity audit. */
const MOUTH_AUDIT_CHANNELS = [
  'mouthRollUpper',
  'mouthRollLower',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthShrugUpper',
  'mouthShrugLower',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthPucker',
  'mouthLeft',
  'mouthRight',
];
const MOUTH_AUDIT = [
  { id: 'neutral', label: 'neutral' },
  { id: 'jawOpen', label: 'jawOpen .5', face: { jawOpen: 0.5 } },
  { id: 'mouthClose', label: 'mouthClose .5 + jawOpen .5', face: { mouthClose: 0.5, jawOpen: 0.5 } },
  ...MOUTH_AUDIT_CHANNELS.map((id) => ({ id, label: id, face: { [id]: 1 } })),
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.vrm': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wasm': 'application/wasm',
};

const log = (msg) => console.log(`saga-human-canonical-v1-pose-sheet: ${msg}`);

/** Read-only static server: /__harness/* → RUN_DIR, everything else → public/. */
function startServer() {
  const server = createServer((req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const [base, rel] = pathname.startsWith(HARNESS_PREFIX)
      ? [RUN_DIR, pathname.slice(HARNESS_PREFIX.length)]
      : [PUBLIC_DIR, pathname.slice(1)];
    const file = normalize(join(base, rel));
    if (!file.startsWith(base + sep) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
  for (const a of AVATARS) {
    if (!existsSync(join(PUBLIC_DIR, a.url))) {
      throw new Error(`${a.id}: ${a.url} missing (reference: npm run fetch:liveact-reference-vrm; canonical: npm run build:saga-human-canonical-v1)`);
    }
  }
  mkdirSync(RUN_DIR, { recursive: true });
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await build({
    entryPoints: [join(root, 'scripts/lib/saga-human-canonical-v1/pose-sheet-page.mjs')],
    outfile: join(RUN_DIR, 'pose-sheet.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  writeFileSync(
    join(RUN_DIR, 'index.html'),
    '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">' +
      `<script type="module" src="${HARNESS_PREFIX}pose-sheet.js"></script></body></html>\n`,
  );

  const server = await startServer();
  const { port } = server.address();
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });
    await page.goto(`http://127.0.0.1:${port}${HARNESS_PREFIX}index.html`);
    await page.waitForFunction(() => window.__poseSheetReady === true, null, { timeout: 60_000 });
    if (ROUNDTRIP_MODE) {
      await runRoundtrip(page, pageErrors);
      return;
    }
    const t0 = Date.now();
    const result = await page.evaluate(
      (config) => window.__poseSheet.run(config),
      { avatars: AVATARS, matrix: MATRIX, sheet11: SHEET_11, closeups: CLOSEUPS, mouthAudit: MOUTH_AUDIT },
    );
    log(`rendered ${Object.keys(result.images).length} sheets in ${Date.now() - t0} ms`);
    if (pageErrors.length) log(`page errors:\n  ${pageErrors.join('\n  ')}`);

    for (const [name, dataUrl] of Object.entries(result.images)) {
      if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error(`${name}: unexpected image encoding`);
      const jpg = Buffer.from(dataUrl.slice('data:image/jpeg;base64,'.length), 'base64');
      writeFileSync(join(EVIDENCE_DIR, `${name}.jpg`), jpg);
      log(`→ .qa/evidence/saga-human-canonical-v1/${name}.jpg (${jpg.byteLength} B)`);
    }
    const report = {
      ...result.report,
      matrix: MATRIX.map((p) => p.id),
      mouthAudit: MOUTH_AUDIT.map((p) => p.id),
      pageErrors,
    };
    for (const entry of Object.values(report.avatars)) delete entry.loadMs;
    writeFileSync(join(EVIDENCE_DIR, 'pose-sheet-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    log('→ .qa/evidence/saga-human-canonical-v1/pose-sheet-report.json');
  } finally {
    await browser.close();
    server.close();
  }
}

async function runRoundtrip(page, pageErrors) {
  const t0 = Date.now();
  const result = await page.evaluate(
    (config) => window.__poseSheet.roundtrip(config),
    { avatars: AVATARS, roundtrip: ROUNDTRIP, lrActions: LR_ACTIONS },
  );
  log(`round trip: ${ROUNDTRIP.length} poses × ${AVATARS.length} avatars in ${Date.now() - t0} ms`);
  if (pageErrors.length) log(`page errors:\n  ${pageErrors.join('\n  ')}`);
  const dataUrl = result.images['roundtrip-frames'];
  if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error('roundtrip-frames: unexpected image encoding');
  const jpg = Buffer.from(dataUrl.slice('data:image/jpeg;base64,'.length), 'base64');
  writeFileSync(join(EVIDENCE_DIR, 'roundtrip-frames.jpg'), jpg);
  log(`→ .qa/evidence/liveact-tracking-roundtrip/roundtrip-frames.jpg (${jpg.byteLength} B)`);

  const conventions = evaluateConventions(result.report);
  const neutral = evaluateNeutral(result.report);
  const lr = evaluateLrChain(result.report);
  const audit = summarizeChannelAudit(result.report, CANDIDATE_ID);
  const failures = [...conventions.failures, ...lr.failures];
  const report = {
    ...result.report,
    poses: ROUNDTRIP,
    lrActions: LR_ACTIONS,
    channelClasses: audit.classes,
    verdict: { failures, assetWeak: conventions.assetWeak, assetSide: lr.assetSide },
    pageErrors,
  };
  writeFileSync(join(EVIDENCE_DIR, 'roundtrip-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  log('→ .qa/evidence/liveact-tracking-roundtrip/roundtrip-report.json');
  const section = (title, rows) => console.log(`\n— ${title} —\n${rows.join('\n')}`);
  section('Konventionen (Tracker liest die Avatar-Pose zurück)', conventions.rows);
  section('Neutral', neutral.rows);
  section(`Links/Rechts-Kette (App: ${result.report.appMirrorsAvatar ? 'gespiegelt' : 'anatomisch'})`, lr.rows);
  section('Kanal-Audit (Render-Proxy: Kanal 1.0 → Tracker-Δ, Morph mm; * = Lippen-Fokus)', [audit.header, ...audit.rows]);
  section('Stufen', summarizeStageTransfer(result.report));
  if (failures.length) {
    throw new Error(`round trip: ${failures.length} failing check(s)`);
  }
  log('round trip OK');
}

main().catch((error) => {
  console.error(`saga-human-canonical-v1-pose-sheet FAIL: ${error instanceof Error ? error.stack : error}`);
  process.exit(1);
});
