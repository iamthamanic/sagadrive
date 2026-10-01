#!/usr/bin/env node
/**
 * face-anchor-agent-review-evidence-capture — Playwright multi-view labeled-anchor evidence.
 * Location: scripts/face-anchor-agent-review-evidence-capture.mjs
 *
 * Captures the face-anchor-agent-review-v1 view matrix under:
 *   <runDir>/agent-review/evidence/
 * Controlled neutral pose, deterministic cameras, no LiveAct/animation, markers labeled.
 *
 * Usage:
 *   node scripts/face-anchor-agent-review-evidence-capture.mjs \
 *     --run-dir assets/species-3d/human/runs/<run> \
 *     --model <path-or-url> \
 *     --anchors <face-anchors.json> \
 *     [--model-sha <hex>] [--anchors-sha <hex>] [--topology <fp>]
 *
 * Without a browser page that exposes SagaDrive face-setup capture hooks, this script
 * still writes a validated capture plan + empty-slot check contract. Prefer the harness
 * page when Character Studio Face Setup is available (`--harness` mode).
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX,
  FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
  agentReviewEvidenceDir,
  sha256Hex,
  validateFaceAnchorAgentReviewEvidenceManifest,
} from './lib/face-anchor-agent-review-v1.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function shaFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const runDirRel = arg('--run-dir');
const modelArg = arg('--model');
const anchorsArg = arg('--anchors');
const dryPlan = process.argv.includes('--plan-only');

if (!runDirRel || !modelArg || !anchorsArg) {
  console.error(
    'Usage: node scripts/face-anchor-agent-review-evidence-capture.mjs --run-dir <run> --model <glb|vrm> --anchors <json> [--plan-only]',
  );
  process.exit(2);
}

const runDir = resolve(root, runDirRel);
const anchorsPath = resolve(root, anchorsArg);
const modelPath = modelArg.startsWith('http') ? modelArg : resolve(root, modelArg);

if (!existsSync(anchorsPath)) {
  console.error(`anchors not found: ${anchorsPath}`);
  process.exit(1);
}

const anchorsSha =
  arg('--anchors-sha') || shaFile(anchorsPath);
const modelSha =
  arg('--model-sha') ||
  (modelPath.startsWith('http') ? '0'.repeat(64) : existsSync(modelPath) ? shaFile(modelPath) : '0'.repeat(64));
const topology = arg('--topology') || 'pending-topology';

const evidenceDir = agentReviewEvidenceDir(runDir);
mkdirSync(evidenceDir, { recursive: true });

const capturePlan = {
  protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
  candidateModelPath: modelArg,
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topology,
  neutralPoseId: 'controlled-neutral-v1',
  liveActEnabled: false,
  animationEnabled: false,
  hideHair: true,
  hideEquipment: true,
  hideHelperDebug: true,
  showLabeledMarkers: true,
  markerLabels: 'anchorId_or_index',
  minWidth: 1280,
  minHeight: 720,
  annotateWithPriorReviews: false,
  matrix: FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX,
  outputDir: evidenceDir,
};

writeFileSync(join(evidenceDir, 'capture-plan.json'), `${JSON.stringify(capturePlan, null, 2)}\n`);

if (dryPlan) {
  console.log(`face-anchor-agent-review-evidence-capture: plan written → ${join(evidenceDir, 'capture-plan.json')}`);
  process.exit(0);
}

// Playwright capture when @playwright/test is available and --harness is set.
const useHarness = process.argv.includes('--harness');
if (!useHarness) {
  // Contract-slice default: synthesize deterministic placeholder PNGs are NOT allowed for real review.
  // Emit manifest template requiring real shots; orchestration rejects missing files.
  /** @type {Array<Record<string, unknown>>} */
  const shots = FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX.map((row) => ({
    view: row.view,
    relativePath: `shots/${row.view}.png`,
    sha256: '0'.repeat(64),
    width: 1280,
    height: 720,
    pendingCapture: true,
  }));
  const manifest = {
    protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
    candidateModelPath: modelArg,
    modelSha256: modelSha,
    topologyFingerprint: topology,
    anchorsSha256: anchorsSha,
    neutralPoseId: 'controlled-neutral-v1',
    liveActEnabled: false,
    animationEnabled: false,
    shots,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(join(evidenceDir, 'evidence-manifest.pending.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    'face-anchor-agent-review-evidence-capture: pending manifest (no --harness). Real screenshots required before agent review.',
  );
  process.exit(0);
}

const { chromium } = await import('@playwright/test');
const { createServer } = await import('node:http');
const { extname } = await import('node:path');

const PUBLIC_DIR = join(root, 'public');
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.vrm': 'model/gltf-binary',
  '.png': 'image/png',
  '.css': 'text/css',
};

function safeJoin(base, rel) {
  const full = resolve(base, rel.replace(/^\//, ''));
  if (!full.startsWith(base)) return null;
  return full;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/face-agent-review-capture.html';

  // Serve candidate model / anchors from repo paths (not only public/).
  if (rel.startsWith('/__model')) {
    const filePath = modelPath.startsWith('http') ? null : modelPath;
    if (!filePath || !existsSync(filePath)) {
      res.writeHead(404);
      res.end('model not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
    return;
  }
  if (rel.startsWith('/__anchors')) {
    if (!existsSync(anchorsPath)) {
      res.writeHead(404);
      res.end('anchors not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(readFileSync(anchorsPath));
    return;
  }

  const filePath = safeJoin(PUBLIC_DIR, rel);
  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const modelQuery = modelPath.startsWith('http') ? modelArg : '/__model';
const harnessUrl =
  `http://127.0.0.1:${port}/face-agent-review-capture.html` +
  `?faceAgentReviewCapture=1` +
  `&model=${encodeURIComponent(modelQuery)}` +
  `&anchors=${encodeURIComponent('/__anchors')}`;
await page.goto(harnessUrl, { waitUntil: 'networkidle', timeout: 120_000 });

await page.waitForFunction(
  () =>
    typeof window.__SAGA_FACE_AGENT_REVIEW_CAPTURE__ === 'function' &&
    window.__SAGA_FACE_AGENT_REVIEW_CAPTURE_READY__ === true,
  { timeout: 120_000 },
);

/** @type {Array<Record<string, unknown>>} */
const shots = [];
mkdirSync(join(evidenceDir, 'shots'), { recursive: true });

for (const row of FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX) {
  await page.evaluate(async (cfg) => {
    await window.__SAGA_FACE_AGENT_REVIEW_CAPTURE__(cfg);
  }, {
    view: row.view,
    yawDeg: row.yawDeg,
    pitchDeg: row.pitchDeg,
    framing: row.framing,
    liveActEnabled: false,
    animationEnabled: false,
    hideHair: true,
    hideEquipment: true,
    hideHelperDebug: true,
    showLabeledMarkers: true,
    annotateWithPriorReviews: false,
  });
  const png = await page.screenshot({ type: 'png', fullPage: false });
  const rel = `shots/${row.view}.png`;
  const out = join(evidenceDir, rel);
  writeFileSync(out, png);
  shots.push({
    view: row.view,
    relativePath: rel,
    sha256: sha256Hex(png),
    width: 1280,
    height: 720,
  });
}

const manifest = {
  protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
  candidateModelPath: modelArg,
  modelSha256: modelSha,
  topologyFingerprint: topology,
  anchorsSha256: anchorsSha,
  neutralPoseId: 'controlled-neutral-v1',
  liveActEnabled: false,
  animationEnabled: false,
  shots,
  createdAt: new Date().toISOString(),
};

const validated = validateFaceAnchorAgentReviewEvidenceManifest(manifest);
if (!validated.ok) {
  console.error('evidence manifest invalid', validated.errors);
  await browser.close();
  server.close();
  process.exit(1);
}

writeFileSync(join(evidenceDir, 'evidence-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(dirname(evidenceDir), 'evidence-manifest.sha256'),
  `${sha256Hex(Buffer.from(`${JSON.stringify(manifest)}\n`, 'utf8'))}\n`,
);

await browser.close();
server.close();
console.log(`face-anchor-agent-review-evidence-capture OK → ${join(evidenceDir, 'evidence-manifest.json')}`);
