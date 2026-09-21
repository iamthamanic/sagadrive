/**
 * liveact-face-asset-validate — Khronos + SagaDrive face GLB gate helpers (#383).
 * Location: scripts/lib/liveact-face-asset-validate.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { validateBytes } from 'gltf-validator';

export const FACE_INVENTORY_VERSION = 'SagaDriveLiveActFaceInventoryV1';

export const CORE_V1_CHANNELS = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthPucker',
  'mouthShrugUpper',
  'mouthShrugLower',
];

export const FULL_V1_CHANNELS = [
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
];

const GAZE_MORPHS = [
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
];

function morphHasNonNullDelta(target) {
  for (const semantic of ['POSITION', 'NORMAL', 'TANGENT']) {
    const acc = target.getAttribute(semantic);
    if (!acc) continue;
    const arr = acc.getArray();
    if (!arr) continue;
    for (let i = 0; i < arr.length; i += 1) {
      if (Number(arr[i]) !== 0) return true;
    }
  }
  return false;
}

function collectMorphInventory(document) {
  /** @type {Map<string, { usable: boolean }>} */
  const byName = new Map();
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const extras = prim.getExtras() || {};
      const meshExtras = mesh.getExtras() || {};
      const targetNames = Array.isArray(extras.targetNames)
        ? extras.targetNames
        : Array.isArray(meshExtras.targetNames)
          ? meshExtras.targetNames
          : [];
      const targets = prim.listTargets();
      for (let i = 0; i < targets.length; i += 1) {
        const name =
          typeof targetNames[i] === 'string' && targetNames[i].trim()
            ? String(targetNames[i]).trim()
            : `target_${i}`;
        const usable = morphHasNonNullDelta(targets[i]);
        const prev = byName.get(name);
        if (!prev || (usable && !prev.usable)) {
          byName.set(name, { usable });
        }
      }
    }
  }
  return byName;
}

function countTriangles(document) {
  let tris = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (indices) tris += Math.floor(indices.getCount() / 3);
      else {
        const pos = prim.getAttribute('POSITION');
        if (pos) tris += Math.floor(pos.getCount() / 3);
      }
    }
  }
  return tris;
}

function preservationSnapshot(document) {
  const root = document.getRoot();
  return {
    meshCount: root.listMeshes().length,
    skinCount: root.listSkins().length,
    materialCount: root.listMaterials().length,
    textureCount: root.listTextures().length,
    skeletonJointCount: root.listSkins().reduce((n, skin) => n + skin.listJoints().length, 0),
    triangleCount: countTriangles(document),
  };
}

function hasEyeBoneNodes(document) {
  return document.getRoot().listNodes().some((n) => {
    const name = (n.getName() || '').toLowerCase().replace(/\s+/g, '');
    return (
      name.includes('lefteye') ||
      name.includes('righteye') ||
      name === 'eye_l' ||
      name === 'eye_r' ||
      name.includes('left_eye') ||
      name.includes('right_eye')
    );
  });
}

function inferGazeMode(usableNames, hasEyeBones) {
  if (GAZE_MORPHS.every((id) => usableNames.has(id))) return 'morphs';
  if (hasEyeBones) return 'bones';
  return 'none';
}

function khronosOk(report) {
  if ((report.issues?.numErrors ?? 0) > 0) return false;
  const messages = report.issues?.messages;
  if (!Array.isArray(messages)) return true;
  return !messages.some((m) => m.severity === 'error');
}

/**
 * @param {{ inputPath: string, baselinePath: string, profile: 'core-v1'|'full-v1', outPath?: string }} opts
 */
export async function validateLiveActFaceAsset(opts) {
  const inputBytes = readFileSync(opts.inputPath);
  const baselineBytes = readFileSync(opts.baselinePath);
  const required = opts.profile === 'full-v1' ? FULL_V1_CHANNELS : CORE_V1_CHANNELS;

  let khronosReport;
  let khronosPass = false;
  try {
    khronosReport = await validateBytes(new Uint8Array(inputBytes));
    khronosPass = khronosOk(khronosReport);
  } catch {
    khronosReport = { issues: { numErrors: 1, numWarnings: 0, messages: [] } };
    khronosPass = false;
  }

  const io = new NodeIO();
  let document;
  let baselineDoc;
  try {
    document = await io.readBinary(new Uint8Array(inputBytes));
    baselineDoc = await io.readBinary(new Uint8Array(baselineBytes));
  } catch (err) {
    const inventory = {
      version: FACE_INVENTORY_VERSION,
      input: basename(opts.inputPath),
      baselineFile: basename(opts.baselinePath),
      profile: opts.profile,
      profileOk: false,
      khronos: { pass: false, numErrors: 1, detail: String(err) },
      sagaDrive: { pass: false, errors: ['glb_parse_failed'], missingRequired: required, emptyMorphs: [], preservationErrors: [] },
      supportedChannels: [],
      presentChannels: [],
      gazeMode: 'none',
      morphCount: 0,
      usableMorphCount: 0,
      byteCount: inputBytes.byteLength,
      meshCount: 0,
      skinCount: 0,
      materialCount: 0,
      textureCount: 0,
      skeletonJointCount: 0,
      triangleCount: 0,
      baselineStats: null,
    };
    if (opts.outPath) writeFileSync(opts.outPath, JSON.stringify(inventory, null, 2));
    return { ok: false, inventory };
  }

  const morphMap = collectMorphInventory(document);
  const usableNames = new Set(
    [...morphMap.entries()].filter(([, v]) => v.usable).map(([k]) => k),
  );
  const presentNames = [...morphMap.keys()];
  const missingRequired = required.filter((id) => !usableNames.has(id));
  const emptyMorphs = presentNames.filter((n) => morphMap.get(n) && !morphMap.get(n).usable);
  const eyeBones = hasEyeBoneNodes(document);
  const gazeMode = inferGazeMode(usableNames, eyeBones);

  const snap = preservationSnapshot(document);
  const baseSnap = preservationSnapshot(baselineDoc);
  const preservationErrors = [];
  if (snap.skinCount < baseSnap.skinCount) preservationErrors.push('skin_count_regressed');
  if (snap.skeletonJointCount < baseSnap.skeletonJointCount) {
    preservationErrors.push('skeleton_joints_regressed');
  }
  if (snap.materialCount < baseSnap.materialCount) preservationErrors.push('material_count_regressed');
  if (snap.textureCount < baseSnap.textureCount) preservationErrors.push('texture_count_regressed');
  if (snap.meshCount < 1) preservationErrors.push('no_meshes');

  const sagaErrors = [];
  if (!khronosPass) sagaErrors.push('khronos_failed');
  if (missingRequired.length) sagaErrors.push('missing_required_morphs');
  if (usableNames.size === 0) sagaErrors.push('no_usable_morphs');
  if (missingRequired.some((id) => emptyMorphs.includes(id))) {
    sagaErrors.push('required_morph_empty_delta');
  }
  sagaErrors.push(...preservationErrors);

  const sagaPass = sagaErrors.length === 0;

  const inventory = {
    version: FACE_INVENTORY_VERSION,
    input: basename(opts.inputPath),
    baselineFile: basename(opts.baselinePath),
    profile: opts.profile,
    profileOk: missingRequired.length === 0,
    khronos: {
      pass: khronosPass,
      numErrors: khronosReport.issues?.numErrors ?? 0,
      numWarnings: khronosReport.issues?.numWarnings ?? 0,
    },
    sagaDrive: {
      pass: sagaPass,
      errors: [...new Set(sagaErrors)],
      missingRequired,
      emptyMorphs,
      preservationErrors,
    },
    supportedChannels: [...usableNames].sort(),
    presentChannels: presentNames.sort(),
    gazeMode,
    morphCount: morphMap.size,
    usableMorphCount: usableNames.size,
    byteCount: inputBytes.byteLength,
    meshCount: snap.meshCount,
    skinCount: snap.skinCount,
    materialCount: snap.materialCount,
    textureCount: snap.textureCount,
    skeletonJointCount: snap.skeletonJointCount,
    triangleCount: snap.triangleCount,
    baselineStats: {
      ...baseSnap,
      byteCount: baselineBytes.byteLength,
    },
  };

  if (opts.outPath) writeFileSync(opts.outPath, JSON.stringify(inventory, null, 2));
  return { ok: sagaPass, inventory };
}

export function parseFaceAssetCheckArgs(argv) {
  const args = { input: null, baseline: null, profile: 'core-v1', out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--baseline') args.baseline = argv[++i];
    else if (a === '--profile') args.profile = argv[++i];
    else if (a === '--out') args.out = argv[++i];
  }
  if (!args.input || !args.baseline) {
    throw new Error(
      'Usage: --input <glb> --baseline <glb> --profile <core-v1|full-v1> --out <json>',
    );
  }
  if (args.profile !== 'core-v1' && args.profile !== 'full-v1') {
    throw new Error('--profile must be core-v1 or full-v1');
  }
  return args;
}
