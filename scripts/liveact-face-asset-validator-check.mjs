#!/usr/bin/env node
/**
 * liveact-face-asset-validator-check — fixtures + CLI wiring for #383.
 * Location: scripts/liveact-face-asset-validator-check.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { Document, NodeIO } from '@gltf-transform/core';
import {
  CORE_V1_CHANNELS,
  validateLiveActFaceAsset,
} from './lib/liveact-face-asset-validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-asset-validator-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const cli = readFileSync(join(root, 'scripts/liveact-face-asset-check.mjs'), 'utf8');
const lib = readFileSync(join(root, 'scripts/lib/liveact-face-asset-validate.mjs'), 'utf8');
const gate = readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

check(/--input/.test(cli) && /--baseline/.test(cli) && /--profile/.test(cli) && /--out/.test(cli), 'CLI flags');
check(/validateBytes/.test(lib), 'Khronos validateBytes');
check(/gltf-validator/.test(JSON.stringify(pkg.devDependencies || {})), 'gltf-validator pinned');
check(/liveact-face-asset-validator-check/.test(gate), 'test-gate wiring');

const outDir = join(root, '.qa/fixtures/liveact-face-asset');
mkdirSync(outDir, { recursive: true });
const io = new NodeIO();

async function makeBodyGlb(opts = {}) {
  const { morphs = [], emptyMorphs = [], materials = true, skins = false } = opts;
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', pos);
  if (skins) {
    const joints = doc
      .createAccessor()
      .setType('VEC4')
      .setArray(new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
      .setBuffer(buffer);
    const weights = doc
      .createAccessor()
      .setType('VEC4')
      .setArray(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]))
      .setBuffer(buffer);
    prim.setAttribute('JOINTS_0', joints).setAttribute('WEIGHTS_0', weights);
  }
  const names = [];
  for (const name of morphs) {
    const delta = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0.05, 0, 0, 0.05, 0, 0, 0.05, 0]))
      .setBuffer(buffer);
    const target = doc.createPrimitiveTarget().setAttribute('POSITION', delta);
    prim.addTarget(target);
    names.push(name);
  }
  for (const name of emptyMorphs) {
    const delta = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]))
      .setBuffer(buffer);
    const target = doc.createPrimitiveTarget().setAttribute('POSITION', delta);
    prim.addTarget(target);
    names.push(name);
  }
  if (names.length) prim.setExtras({ targetNames: names });
  if (materials) {
    const mat = doc.createMaterial('body');
    prim.setMaterial(mat);
  }
  const mesh = doc.createMesh('body').addPrimitive(prim);
  const node = doc.createNode('root').setMesh(mesh);
  if (skins) {
    const joint = doc.createNode('Hips');
    const skin = doc.createSkin('skin').addJoint(joint).setSkeleton(joint);
    node.setSkin(skin);
    doc.createScene().addChild(node).addChild(joint);
  } else {
    doc.createScene().addChild(node);
  }
  return Buffer.from(await io.writeBinary(doc));
}

const baselinePath = join(outDir, 'baseline-body.glb');
const coreOkPath = join(outDir, 'face-core-ok.glb');
const missingMorphPath = join(outDir, 'face-missing-core.glb');
const emptyMorphPath = join(outDir, 'face-empty-morph.glb');
const invalidPath = join(outDir, 'invalid.glb');
const stripMatPath = join(outDir, 'face-strip-material.glb');

writeFileSync(baselinePath, await makeBodyGlb({ materials: true, skins: true }));
writeFileSync(
  coreOkPath,
  await makeBodyGlb({ morphs: [...CORE_V1_CHANNELS], materials: true, skins: true }),
);
writeFileSync(
  missingMorphPath,
  await makeBodyGlb({ morphs: ['jawOpen'], materials: true, skins: true }),
);
writeFileSync(
  emptyMorphPath,
  await makeBodyGlb({
    morphs: CORE_V1_CHANNELS.filter((c) => c !== 'jawOpen'),
    emptyMorphs: ['jawOpen'],
    materials: true,
    skins: true,
  }),
);
writeFileSync(invalidPath, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]));
writeFileSync(
  stripMatPath,
  await makeBodyGlb({ morphs: [...CORE_V1_CHANNELS], materials: false, skins: true }),
);

const invOut = join(outDir, 'face-inventory-core-ok.json');
const ok = await validateLiveActFaceAsset({
  inputPath: coreOkPath,
  baselinePath,
  profile: 'core-v1',
  outPath: invOut,
});
check(ok.ok === true, 'core-ok passes');
check(ok.inventory.khronos.pass === true, 'khronos pass on valid');
check(ok.inventory.sagaDrive.pass === true, 'sagaDrive pass');
check(ok.inventory.supportedChannels.includes('jawOpen'), 'inventory lists jawOpen');
check(typeof ok.inventory.byteCount === 'number', 'byteCount');
check(typeof ok.inventory.triangleCount === 'number', 'triangleCount');

const missing = await validateLiveActFaceAsset({
  inputPath: missingMorphPath,
  baselinePath,
  profile: 'core-v1',
});
check(missing.ok === false, 'missing core morph fails');
check(missing.inventory.sagaDrive.errors.includes('missing_required_morphs'), 'missing error');

const empty = await validateLiveActFaceAsset({
  inputPath: emptyMorphPath,
  baselinePath,
  profile: 'core-v1',
});
check(empty.ok === false, 'empty morph delta fails');

const invalid = await validateLiveActFaceAsset({
  inputPath: invalidPath,
  baselinePath,
  profile: 'core-v1',
});
check(invalid.ok === false, 'invalid glb fails');

const strip = await validateLiveActFaceAsset({
  inputPath: stripMatPath,
  baselinePath,
  profile: 'core-v1',
});
check(strip.ok === false, 'material regression fails');
check(
  strip.inventory.sagaDrive.preservationErrors.includes('material_count_regressed'),
  'preservation material',
);

// CLI smoke
execFileSync(
  process.execPath,
  [
    join(root, 'scripts/liveact-face-asset-check.mjs'),
    '--input',
    coreOkPath,
    '--baseline',
    baselinePath,
    '--profile',
    'core-v1',
    '--out',
    join(outDir, 'cli-out.json'),
  ],
  { cwd: root, stdio: 'pipe' },
);

console.log('liveact-face-asset-validator-check OK');
