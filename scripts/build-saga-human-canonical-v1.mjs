#!/usr/bin/env node
/**
 * build-saga-human-canonical-v1 — build the Saga Human Canonical V1 PoC VRM from pinned CC0 MakeHuman data.
 * Location: scripts/build-saga-human-canonical-v1.mjs
 *
 * verified sources → assemble one identity → base GLB (no morphs) + face GLB → existing face-asset
 * validator (full-v1, gaze owner = eye bones) → existing VRM packer (LookAt bone, measured offset)
 * → face anchors from canonical topology landmarks (existing anchor contract + binding check)
 * → deterministic build report with measured facts.
 * No Blender / MakeHuman / MPFB at build time or runtime.
 *
 * Usage: node scripts/build-saga-human-canonical-v1.mjs [--offline]
 */

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { validateBytes } from 'gltf-validator';
import { ensureSagaHumanCanonicalV1Sources, SOURCES_MANIFEST_REL } from './lib/saga-human-canonical-v1/sources.mjs';
import {
  parseMhclo,
  parseMhskel,
  parseMhw,
  parseObj,
  parseTarget,
} from './lib/saga-human-canonical-v1/makehuman-formats.mjs';
import { assembleCanonicalHuman, canonicalHumanoidRigBones } from './lib/saga-human-canonical-v1/assemble.mjs';
import { writeCanonicalHumanGlb } from './lib/saga-human-canonical-v1/write-glb.mjs';
import { inspectCanonicalHumanVrm } from './lib/saga-human-canonical-v1/inspect-vrm.mjs';
import { FULL_V1_CHANNELS, validateLiveActFaceAsset } from './lib/liveact-face-asset-validate.mjs';
import { packAvatarVrm1 } from './lib/avatar-vrm-pack.mjs';
import { bindingForVertex } from './lib/liveact-face-anchor-heuristic.mjs';
import { FACE_ANCHORS_CONTRACT_VERSION, SAGA_DRIVE_FACE_ANCHOR_IDS } from './lib/liveact-face-anchor-ids.mjs';
import { validateFaceAnchorsManifestFile } from './lib/liveact-face-anchor-validate.mjs';
import {
  createAutoUnreviewedFaceMappingAuthoring,
  faceMappingAuthoringPathBesideAnchors,
} from './lib/liveact-face-mapping-authoring.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const ID = 'saga-human-canonical-v1';
const BUILD_DIR = join(root, '.cache', ID, 'build');
const ASSET_REL = 'assets/species-3d/human-canonical-v1';
const PUBLIC_REL = 'public/assets/avatars/canonical';
const VRM_REL = `${PUBLIC_REL}/${ID}.vrm`;
const ANCHORS_REL = `${PUBLIC_REL}/${ID}-face-anchors.json`;
/** Bone LookAt: eyes aim at the target 1:1 up to 30° (default 90° → 10° would hide LiveAct gaze). */
const LOOKAT_RANGE_MAP = Object.freeze({ inputMaxValue: 30, outputScale: 30 });
const EXPECTED_FACEUNITS = [...FULL_V1_CHANNELS, 'tongueOut'].sort();

const log = (msg) => console.log(`build-saga-human-canonical-v1: ${msg}`);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const writeJson = (rel, value) => writeFileSync(join(root, rel), `${JSON.stringify(value, null, 2)}\n`);
const round = (v, digits = 4) => Number(v.toFixed(digits));

async function main() {
  const offline = process.argv.includes('--offline');
  const { manifest, paths } = await ensureSagaHumanCanonicalV1Sources({ root, verifyOnly: offline, log });
  const text = (id) => readFileSync(paths.get(id), 'utf8');
  const bytes = (id) => new Uint8Array(readFileSync(paths.get(id)));

  const faceunits = manifest.files
    .filter((f) => f.id.startsWith('faceunit:'))
    .map((f) => f.id.slice('faceunit:'.length))
    .sort();
  if (JSON.stringify(faceunits) !== JSON.stringify(EXPECTED_FACEUNITS)) {
    throw new Error('pinned faceunits do not equal LiveAct full-v1 channels + tongueOut');
  }

  const proxy = (key) => ({ mhclo: parseMhclo(text(`${key}:mhclo`)), obj: parseObj(text(`${key}:obj`)) });
  const assembled = assembleCanonicalHuman({
    base: parseObj(text('base-mesh')),
    identity: parseTarget(text('identity:caucasian-male-young')),
    skeleton: parseMhskel(text('rig')),
    weights: parseMhw(text('rig-weights')),
    faceunits: faceunits.map((name) => ({ name, target: parseTarget(text(`faceunit:${name}`)) })),
    proxies: {
      eyes: proxy('eyes'),
      teeth: proxy('teeth'),
      tongue: proxy('tongue'),
      eyelashes: proxy('eyelashes'),
      eyebrows: proxy('eyebrows'),
    },
  });
  for (const p of assembled.qa.parts) log(`part ${p.name}: ${p.vertices} verts, ${p.triangles} tris, ${p.morphTargets} morphs`);

  const textures = {
    skin: bytes('skin:texture'),
    eyes: bytes('eyes:texture'),
    teeth: bytes('teeth:texture'),
    tongue: bytes('tongue:texture'),
    eyelashes: bytes('eyelashes:texture'),
    eyebrows: bytes('eyebrows:texture'),
  };
  mkdirSync(BUILD_DIR, { recursive: true });
  const generator = `SagaDrive ${ID} (MakeHuman CC0 data)`;
  const basePath = join(BUILD_DIR, `${ID}-base.glb`);
  const facePath = join(BUILD_DIR, `${ID}-face.glb`);
  const baseGlb = await writeCanonicalHumanGlb({ assembled, textures, includeMorphs: false, generator });
  const faceGlb = await writeCanonicalHumanGlb({ assembled, textures, includeMorphs: true, generator });
  writeFileSync(basePath, baseGlb);
  writeFileSync(facePath, faceGlb);
  log(`GLB base ${baseGlb.byteLength} B, face ${faceGlb.byteLength} B`);

  // Existing gate (Khronos + full-v1 + preservation). The author decides the single gaze owner.
  const inventoryRel = `${ASSET_REL}/face-inventory.json`;
  const validation = await validateLiveActFaceAsset({
    inputPath: facePath,
    baselinePath: basePath,
    profile: 'full-v1',
    outPath: join(root, inventoryRel),
    gazeOwner: 'bones',
  });
  const inv = validation.inventory;
  if (!inv.structuralPass) throw new Error(`face asset gate failed: ${inv.sagaDrive.errors.join(', ')}`);
  log(`face gate OK: ${inv.supportedChannels.length} usable channels, gaze ${inv.gazeMode} (${inv.gazeModeSource})`);

  const rigRel = `${ASSET_REL}/rig.json`;
  writeJson(rigRel, {
    contractVersion: 'SagaDriveHumanoidRigV1',
    bones: canonicalHumanoidRigBones(),
    nonHumanoidJoints: ['jaw'],
    note: 'Joint nodes are named by VRM humanoid id; jaw is skinned but morph-owned (never a humanoid bone).',
  });

  const joint = (id) => assembled.joints.find((j) => j.id === id).world;
  const head = joint('head');
  const eyeMid = [0, 1, 2].map((k) => (joint('leftEye')[k] + joint('rightEye')[k]) / 2);
  const lookAt = {
    offsetFromHeadBone: eyeMid.map((v, k) => round(v - head[k])),
    rangeMap: { ...LOOKAT_RANGE_MAP },
  };
  const packedPath = join(BUILD_DIR, `${ID}.vrm`);
  const packed = await packAvatarVrm1({
    inputGlbPath: facePath,
    inventoryPath: join(root, inventoryRel),
    outputVrmPath: packedPath,
    rigPath: join(root, rigRel),
    metaName: 'Saga Human Canonical V1',
    lookAt,
  });
  mkdirSync(join(root, PUBLIC_REL), { recursive: true });
  copyFileSync(packedPath, join(root, VRM_REL));
  const vrmBytes = readFileSync(join(root, VRM_REL));
  log(`VRM ${vrmBytes.byteLength} B → ${VRM_REL}`);

  const khronosVrm = await validateBytes(new Uint8Array(vrmBytes));
  if (khronosVrm.issues.numErrors > 0) throw new Error(`VRM has ${khronosVrm.issues.numErrors} Khronos errors`);
  const vrmQa = await inspectCanonicalHumanVrm(vrmBytes);
  if (!vrmQa.pass) throw new Error(`VRM structural QA failed: ${vrmQa.failures.join('; ')}`);

  // Overlay anchors = canonical topology landmarks, same contract as every avatar (auto / unreviewed).
  const vrmDoc = await new NodeIO().readBinary(new Uint8Array(vrmBytes));
  const bodyPrim = vrmDoc
    .getRoot()
    .listNodes()
    .find((node) => node.getName() === 'Body')
    ?.getMesh()
    ?.listPrimitives()[0];
  if (!bodyPrim) throw new Error('packed VRM has no Body primitive');
  const anchors = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    if (assembled.landmarks[id] == null) throw new Error(`face landmark ${id} missing`);
    anchors[id] = bindingForVertex('Body', 0, bodyPrim, assembled.landmarks[id]);
  }
  writeJson(ANCHORS_REL, { contractVersion: FACE_ANCHORS_CONTRACT_VERSION, anchors });
  writeJson(
    faceMappingAuthoringPathBesideAnchors(ANCHORS_REL),
    createAutoUnreviewedFaceMappingAuthoring({
      modelPath: VRM_REL,
      modelSha256: sha256(vrmBytes),
      note: 'Canonical topology landmarks (lash rows, eyebrow proxy, midline profile, mouthSmile peaks); unreviewed auto.',
    }),
  );
  const bound = await validateFaceAnchorsManifestFile({
    manifestPath: join(root, ANCHORS_REL),
    glbPath: join(root, VRM_REL),
  });
  if (!bound.ok) throw new Error(`face anchors do not bind: ${(bound.errors ?? []).join(', ')}`);

  // Semantic QA V2 on topology anchors (only mouth corners come from morph peaks) → reported, not gating.
  const semantic = await validateLiveActFaceAsset({
    inputPath: facePath,
    baselinePath: basePath,
    profile: 'full-v1',
    anchorsPath: join(root, ANCHORS_REL),
    gazeOwner: 'bones',
  });
  const sq = semantic.inventory.semanticQa ?? {};
  const channelResults = Object.entries(sq.channels ?? {});

  writeJson(`${ASSET_REL}/build-report.json`, {
    contractVersion: 'SagaHumanCanonicalBuildReportV1',
    humanId: ID,
    sourcesManifestSha256: sha256(readFileSync(join(root, SOURCES_MANIFEST_REL))),
    identity: 'caucasian-male-young × 1.0 (average muscle/weight = no extra target)',
    outputs: {
      baseGlb: { sha256: sha256(baseGlb), bytes: baseGlb.byteLength },
      faceGlb: { sha256: sha256(faceGlb), bytes: faceGlb.byteLength },
      vrm: { path: VRM_REL, sha256: sha256(vrmBytes), bytes: vrmBytes.byteLength },
      faceAnchors: { path: ANCHORS_REL, bindsToVrm: bound.ok },
    },
    faceGate: {
      profile: inv.profile,
      structuralPass: inv.structuralPass,
      khronosErrors: inv.khronos.numErrors,
      khronosWarnings: inv.khronos.numWarnings,
      usableChannels: inv.supportedChannels.length,
      missingRequired: inv.sagaDrive.missingRequired,
      gazeMode: inv.gazeMode,
      gazeModeSource: inv.gazeModeSource,
    },
    vrmPack: {
      humanoidBoneCount: packed.manifest.humanoidBoneCount,
      expressionPresetCount: packed.manifest.expressionPresetCount,
      expressionCustomCount: packed.manifest.expressionCustomCount,
      lookAt,
      khronosErrors: khronosVrm.issues?.numErrors ?? null,
      khronosWarnings: khronosVrm.issues?.numWarnings ?? null,
    },
    structuralQa: { assembled: assembled.qa, vrm: vrmQa },
    semanticQaV2: {
      note: 'Anchors are topology landmarks (auto/unreviewed); only the mouth corners derive from morph peaks. Informative, not a gate.',
      pass: sq.pass ?? null,
      channelsPassed: channelResults.filter(([, c]) => c?.pass === true).length,
      channelsFailed: channelResults.filter(([, c]) => c?.pass === false).map(([id]) => id).sort(),
      violations: sq.violations ?? [],
    },
    contracts: {
      gaze: 'eye bones (leftEye/rightEye) via VRM LookAt type bone; eyeLook* morphs stay in the asset without expressions',
      jaw: 'morph-owned (faceunits jaw*: chin, lips, mouth floor, lower teeth, tongue move together); jaw joint skinned, never driven, not humanoid',
      tongueOut: 'asset capability yes (custom expression on Tongue); LiveAct tracking no (not a LiveAct channel)',
    },
  });
  log(`report → ${ASSET_REL}/build-report.json (semantic QA V2 pass=${sq.pass ?? 'n/a'})`);
  log('OK');
}

main().catch((error) => {
  console.error(`build-saga-human-canonical-v1 FAIL: ${error instanceof Error ? error.stack : error}`);
  process.exit(1);
});
