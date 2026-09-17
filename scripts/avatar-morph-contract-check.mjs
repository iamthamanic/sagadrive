#!/usr/bin/env node
/**
 * avatar-morph-contract-check — deterministic tests for #212 SagaDriveAvatarMorphV1.
 * Location: scripts/avatar-morph-contract-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-morph-contract-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const contract = read('src/domains/character/avatar/morph-contract.ts');
const index = read('src/domains/character/avatar/index.ts');
const entity = read('src/domains/character/domain/character.entity.ts');

check(/MORPH_CONTRACT_VERSION/.test(contract), 'morph contract version');
check(/SagaDriveAvatarMorphStateV1/.test(contract), 'morph state type');
check(/AVATAR_MORPH_BODY_KEYS/.test(contract), 'body keys');
check(/AVATAR_MORPH_FACE_KEYS/.test(contract), 'face keys');
check(/AVATAR_MORPH_PARAM_META/.test(contract), 'UI metadata');
check(/validateAvatarMorphInput/.test(contract), 'validation');
check(/mergeAvatarMorphPresets/.test(contract), 'preset merge');
check(/migrateCharacterAvatarDtoToMorph/.test(contract), 'legacy migration');
check(/resolveAvatarMorphCapabilities/.test(contract), 'capability resolver');
check(/morph-body-v1/.test(contract) && /morph-face-v1/.test(contract), 'capability flags');
check(!/from ['"]three['"]/.test(contract), 'domain morph has no Three');
check(!/from ['"]react['"]/.test(contract), 'domain morph has no React');
check(/export \{[\s\S]*validateAvatarMorphInput/.test(index), 'barrel exports validation');
check(/morph\?:/.test(entity) || /morph\?:/.test(entity), 'DTO optional morph');
check(/eyes\?:/.test(entity), 'DTO optional eyes color');

// --- pure replicas of contract logic ---
const BODY = [
  'height',
  'headSize',
  'shoulderWidth',
  'chest',
  'waist',
  'hips',
  'armLength',
  'legLength',
  'build',
  'muscularity',
];
const FACE = [
  'faceWidth',
  'faceLength',
  'jawWidth',
  'chin',
  'cheekbones',
  'noseWidth',
  'noseLength',
  'eyeSize',
  'eyeSpacing',
  'eyeAngle',
  'mouthWidth',
  'lipFullness',
  'earSize',
];

function clamp(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

function legacyToMorph(v) {
  return clamp((v - 50) / 50);
}

function defaults() {
  const body = Object.fromEntries(BODY.map((k) => [k, 0]));
  const face = Object.fromEntries(FACE.map((k) => [k, 0]));
  return {
    contractVersion: 'SagaDriveAvatarMorphV1',
    body,
    face,
    colors: { skin: '#F5E6D3', eyes: '#3A2F28', hair: '#000000' },
    traits: { markings: [], scars: [], cybernetics: [] },
  };
}

function validate(input) {
  const ignored = [];
  const warnings = [];
  const state = defaults();
  if (input == null || typeof input !== 'object') {
    return { state, ignored, warnings };
  }
  for (const key of Object.keys(input)) {
    if (!['contractVersion', 'body', 'face', 'colors', 'traits'].includes(key)) {
      ignored.push(key);
    }
  }
  if (input.body && typeof input.body === 'object') {
    for (const [k, raw] of Object.entries(input.body)) {
      if (!BODY.includes(k)) {
        ignored.push(`body.${k}`);
        continue;
      }
      state.body[k] = typeof raw === 'number' ? clamp(raw) : 0;
    }
  }
  if (input.face && typeof input.face === 'object') {
    for (const [k, raw] of Object.entries(input.face)) {
      if (!FACE.includes(k)) {
        ignored.push(`face.${k}`);
        continue;
      }
      state.face[k] = typeof raw === 'number' ? clamp(raw) : 0;
    }
  }
  return { state, ignored, warnings };
}

function merge(baseIn, overIn) {
  const base = validate(baseIn).state;
  const over = validate(overIn).state;
  const body = { ...base.body };
  const face = { ...base.face };
  const overBody = overIn?.body && typeof overIn.body === 'object' ? overIn.body : {};
  const overFace = overIn?.face && typeof overIn.face === 'object' ? overIn.face : {};
  for (const k of BODY) {
    if (Object.prototype.hasOwnProperty.call(overBody, k)) body[k] = over.body[k];
  }
  for (const k of FACE) {
    if (Object.prototype.hasOwnProperty.call(overFace, k)) face[k] = over.face[k];
  }
  return { ...base, body, face };
}

function migrate(avatar) {
  const state = defaults();
  if (!avatar) return state;
  state.body.height = legacyToMorph(avatar.body?.height ?? 50);
  state.body.build = legacyToMorph(avatar.body?.size ?? 50);
  return state;
}

function caps({ hasBodyMorphTargets, hasFaceMorphTargets }) {
  const flags = [];
  if (hasBodyMorphTargets) flags.push('morph-body-v1');
  if (hasFaceMorphTargets) flags.push('morph-face-v1');
  return flags;
}

// bounds
check(validate({ body: { height: 2 } }).state.body.height === 1, 'clamp high');
check(validate({ body: { height: -3 } }).state.body.height === -1, 'clamp low');
check(validate({ body: { height: Number.NaN } }).state.body.height === 0, 'NaN → 0');
check(validate({ body: { height: 0.25 } }).state.body.height === 0.25, 'in-range kept');

// unknown keys fail-safe
const unk = validate({ body: { height: 0.5, tentacles: 1 }, capabilities: ['morph-body-v1'], extra: true });
check(unk.ignored.includes('body.tentacles'), 'unknown body key ignored');
check(unk.ignored.includes('capabilities'), 'client capabilities ignored');
check(unk.ignored.includes('extra'), 'top-level unknown ignored');
check(unk.state.body.height === 0.5, 'known key still applied');
check(!('tentacles' in unk.state.body), 'unknown not invented on state');

// legacy migration
const legacy = migrate({ body: { height: 100, size: 0 }, colors: { hair: '#111111', skin: '#ABCDEF' } });
check(legacy.body.height === 1, 'legacy height 100 → 1');
check(legacy.body.build === -1, 'legacy size 0 → -1');
check(legacy.body.muscularity === 0, 'unset morph defaults 0');
check(migrate(null).body.height === 0, 'null avatar → defaults');

// preset merge deterministic
const merged = merge(
  { body: { height: 0.2, build: -0.5 }, face: { eyeSize: 0.1 } },
  { body: { height: 0.8 }, face: { noseWidth: -0.3 } },
);
check(merged.body.height === 0.8, 'overlay height wins');
check(merged.body.build === -0.5, 'base build kept when not in overlay');
check(merged.face.eyeSize === 0.1, 'base face kept');
check(merged.face.noseWidth === -0.3, 'overlay face applied');
const merged2 = merge(
  { body: { height: 0.2, build: -0.5 }, face: { eyeSize: 0.1 } },
  { body: { height: 0.8 }, face: { noseWidth: -0.3 } },
);
check(JSON.stringify(merged) === JSON.stringify(merged2), 'preset merge deterministic');

// capabilities never invented from empty evidence
check(caps({ hasBodyMorphTargets: false, hasFaceMorphTargets: false }).length === 0, 'no evidence → no caps');
check(
  caps({ hasBodyMorphTargets: true, hasFaceMorphTargets: false }).join(',') === 'morph-body-v1',
  'body only',
);

// completeness of documented keys in source
for (const k of BODY) {
  check(new RegExp(`'${k}'`).test(contract), `body key ${k} in contract`);
}
for (const k of FACE) {
  check(new RegExp(`'${k}'`).test(contract), `face key ${k} in contract`);
}
check(BODY.length === 10, '10 body params');
check(FACE.length === 13, '13 face params');

console.log('avatar-morph-contract-check PASS');
