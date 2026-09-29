#!/usr/bin/env node
/**
 * liveact-face-mapping-auto-capture-visibility-check — MediaPipe capture base-face visibility (#421 P2).
 * Location: scripts/liveact-face-mapping-auto-capture-visibility-check.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import * as THREE from 'three';

const root = fileURLToPath(new URL('..', import.meta.url));
const runsDir = join(root, '.qa/runs');
mkdirSync(runsDir, { recursive: true });

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-mapping-auto-capture-visibility-check FAIL: ${msg}`);
    process.exit(1);
  }
}

async function loadModule(rel, outName) {
  const outfile = join(runsDir, outName);
  await build({
    entryPoints: [join(root, rel)],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile,
    external: ['three'],
    logLevel: 'silent',
  });
  return import(`${outfile}?t=${Date.now()}`);
}

const studio = readFileSync(join(root, 'src/infrastructure/character/avatar/character-studio-runtime.ts'), 'utf8');
const rigidSrc = readFileSync(
  join(root, 'src/infrastructure/character/avatar/avatar-rigid-equipment-runtime.ts'),
  'utf8',
);
const skinnedSrc = readFileSync(
  join(root, 'src/infrastructure/character/avatar/avatar-skinned-wearable-runtime.ts'),
  'utf8',
);

check(/beginFaceMappingBaseFaceCapture/.test(studio), 'studio calls equipment begin capture');
check(/withFaceMappingBaseFaceCapture/.test(studio), 'studio nestable base-face scope');
check(
  /faceMappingBaseFaceCaptureDepth[\s\S]*endFaceMappingBaseFaceCaptureScope|endFaceMappingBaseFaceCaptureScope[\s\S]*faceMappingBaseFaceCaptureDepth/.test(
    studio,
  ),
  'studio restores only on outermost scope exit',
);
check(/beginFaceMappingBaseFaceCaptureVisibility/.test(rigidSrc), 'rigid uses shared visibility helper');
check(/beginFaceMappingBaseFaceCaptureVisibility/.test(skinnedSrc), 'skinned uses shared visibility helper');
check(
  /withFaceMappingBaseFaceCapture/.test(
    readFileSync(join(root, 'src/app/character/liveact/LiveActViewportControls.tsx'), 'utf8'),
  ),
  'controls keep base-face scope through Auto raycasts',
);

const { withFaceMappingBaseFaceCaptureVisibility, beginFaceMappingBaseFaceCaptureVisibility } =
  await loadModule(
    'src/infrastructure/character/avatar/face-mapping-base-face-capture-visibility.ts',
    'liveact-face-mapping-base-face-capture-visibility-bundle.mjs',
  );
const { AvatarRigidEquipmentRuntime } = await loadModule(
  'src/infrastructure/character/avatar/avatar-rigid-equipment-runtime.ts',
  'liveact-avatar-rigid-equipment-capture-bundle.mjs',
);
const { AvatarSkinnedWearableRuntime } = await loadModule(
  'src/infrastructure/character/avatar/avatar-skinned-wearable-runtime.ts',
  'liveact-avatar-skinned-wearable-capture-bundle.mjs',
);

// A) no equipment → capture visibility is a no-op
{
  const face = new THREE.Object3D();
  face.name = 'FaceSkin';
  face.visible = true;
  const before = face.visible;
  withFaceMappingBaseFaceCaptureVisibility({ hide: [], reveal: [] }, () => {
    check(face.visible === before, 'A: no equipment mid-capture unchanged');
  });
  check(face.visible === before, 'A: no equipment after restore');
}

// B) rigid face equipment visible → hidden during capture → restored; hideTargets revealed then restored
{
  const avatar = new THREE.Object3D();
  const face = new THREE.Object3D();
  face.name = 'HeadSkin';
  face.visible = false; // masked by helmet
  avatar.add(face);
  const helmet = new THREE.Object3D();
  helmet.name = 'rigid-helmet-1';
  helmet.visible = true;
  avatar.add(helmet);

  const rigid = new AvatarRigidEquipmentRuntime();
  rigid.bindAvatar(avatar, null);
  rigid.attachSyntheticForFaceMappingCaptureTest({
    instanceId: 'helmet-1',
    root: helmet,
    hideTargets: [face],
  });

  const restore = rigid.beginFaceMappingBaseFaceCapture();
  check(helmet.visible === false, 'B: rigid equipment hidden during capture');
  check(face.visible === true, 'B: rigid hideTarget revealed during capture');
  check(rigid.getGroup().visible === false, 'B: rigid group hidden during capture');
  restore();
  check(helmet.visible === true, 'B: rigid equipment restored visible');
  check(face.visible === false, 'B: hideTarget restored hidden');
  check(rigid.getGroup().visible === true, 'B: rigid group restored');
}

// C) skinned wearable → same hide/reveal/restore
{
  const avatar = new THREE.Object3D();
  const face = new THREE.Object3D();
  face.name = 'head_geo';
  face.userData.sdBodyRegion = 'head';
  face.visible = true;
  avatar.add(face);
  const mask = new THREE.Object3D();
  mask.name = 'skinned-mask-1';
  mask.visible = true;
  avatar.add(mask);

  const skinned = new AvatarSkinnedWearableRuntime();
  skinned.bindAvatar(avatar, null);
  skinned.attachSyntheticForFaceMappingCaptureTest({
    instanceId: 'mask-1',
    root: mask,
    maskRegions: ['head'],
  });
  check(face.visible === false, 'C: skinned mask hid base head before capture');

  const restore = skinned.beginFaceMappingBaseFaceCapture();
  check(mask.visible === false, 'C: skinned wearable hidden during capture');
  check(face.visible === true, 'C: masked base revealed during capture');
  restore();
  check(mask.visible === true, 'C: skinned wearable restored visible');
  check(face.visible === false, 'C: base head restored hidden by mask');
}

// C2) nested scope: base stays revealed after inner capture restore until outer exits (Auto raycast window)
{
  const avatar = new THREE.Object3D();
  const face = new THREE.Object3D();
  face.name = 'head_geo';
  face.userData.sdBodyRegion = 'head';
  face.visible = true;
  avatar.add(face);
  const mask = new THREE.Object3D();
  mask.name = 'skinned-mask-nested';
  mask.visible = true;
  avatar.add(mask);

  const skinned = new AvatarSkinnedWearableRuntime();
  skinned.bindAvatar(avatar, null);
  skinned.attachSyntheticForFaceMappingCaptureTest({
    instanceId: 'mask-nested',
    root: mask,
    maskRegions: ['head'],
  });

  // Simulate nestable runtime depth: outer begin, inner begin+end (capture), raycast still sees face.
  const hide = [skinned.getGroup(), mask];
  const reveal = [face];
  let outerRestore = null;
  let depth = 0;
  const begin = () => {
    if (depth === 0) {
      outerRestore = beginFaceMappingBaseFaceCaptureVisibility({ hide, reveal });
    }
    depth += 1;
  };
  const end = () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0 && outerRestore) {
      outerRestore();
      outerRestore = null;
    }
  };

  begin(); // outer Auto scope
  begin(); // inner capture
  check(face.visible === true && mask.visible === false, 'C2: during nested capture base revealed');
  end(); // capture returns — must NOT restore yet
  check(face.visible === true && mask.visible === false, 'C2: after inner exit base still revealed for raycast');
  end(); // outer Auto scope
  check(face.visible === false && mask.visible === true, 'C2: after outer exit equipment/mask restored');
}

// D) capture throws → visibility still restored
{
  const eq = new THREE.Object3D();
  eq.visible = true;
  const base = new THREE.Object3D();
  base.visible = false;
  let threw = false;
  try {
    withFaceMappingBaseFaceCaptureVisibility({ hide: [eq], reveal: [base] }, () => {
      check(eq.visible === false && base.visible === true, 'D: mid-throw state applied');
      throw new Error('capture failed');
    });
  } catch {
    threw = true;
  }
  check(threw, 'D: error propagated');
  check(eq.visible === true && base.visible === false, 'D: visibility restored after throw');
}

// E) equipment already hidden stays hidden after restore
{
  const eq = new THREE.Object3D();
  eq.visible = false;
  const restore = beginFaceMappingBaseFaceCaptureVisibility({ hide: [eq], reveal: [] });
  check(eq.visible === false, 'E: already-hidden stays hidden during capture');
  restore();
  check(eq.visible === false, 'E: already-hidden restored as hidden');
}

// F) no persist / trait mutation — helper only touches .visible (source contract)
{
  const helperSrc = readFileSync(
    join(root, 'src/infrastructure/character/avatar/face-mapping-base-face-capture-visibility.ts'),
    'utf8',
  );
  check(!/\bapplyVisuals\b|\blocalStorage\b/.test(helperSrc), 'F: helper has no persist APIs');
  check(!/\.position\b|\.scale\b|\.rotation\b/.test(helperSrc), 'F: helper does not mutate transforms');
  check(
    /object\.visible = false/.test(helperSrc) && /entry\.object\.visible = entry\.visible/.test(helperSrc),
    'F: helper only snapshots/restores .visible',
  );
}

writeFileSync(
  join(runsDir, 'liveact-face-mapping-auto-capture-visibility-check.md'),
  `# Face Mapping Auto Capture Visibility\n\nPASS ${new Date().toISOString()}\n`,
);

console.log('liveact-face-mapping-auto-capture-visibility-check PASS');
