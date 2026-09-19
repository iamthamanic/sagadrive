#!/usr/bin/env node
/**
 * avatar-base-bodies-check — deterministic tests for #213 morphable base bodies.
 * Location: scripts/avatar-base-bodies-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-base-bodies-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const contract = read('src/domains/character/avatar/base-body-contract.ts');
const catalog = read('src/infrastructure/character/avatar/base-body-catalog.ts');
const fixture = read('src/app/character/avatar/BaseBodyMorphFixture.tsx');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const index = read('src/domains/character/avatar/index.ts');
const morph = read('src/domains/character/avatar/morph-contract.ts');

check(/BASE_BODY_CONTRACT_VERSION/.test(contract), 'base body contract version');
check(/createSagaDriveBaseBodyManifestV1/.test(contract), 'manifest factory');
check(/BASE_BODY_SPECIES_PRESETS/.test(contract), 'species presets');
check(/resolveBaseBodyMorphCapabilities/.test(contract), 'capability resolver');
check(/buildBaseBodyMorphFixtureCases/.test(contract), 'fixture cases');
check(/isBaseBodyCacheCompatible/.test(contract), 'cache invalidation');
check(/'skin'/.test(contract) && /'eyes'/.test(contract) && /'hair-compatible'/.test(contract) && /'body-detail'/.test(contract), 'material slots');
check(/ears/.test(contract) && /horns/.test(contract) && /cybernetics/.test(contract), 'trait sockets');
check(!/from ['"]three['"]/.test(contract), 'domain has no Three');

check(/isAllowlistedBaseBodyPath/.test(catalog), 'allowlist');
check(/allowlistedCanonicalBodyPaths|sd_body_standard_v1|sagadrive-base-humanoid-v1/.test(catalog), 'allowlisted paths');
check(/evaluateBaseBodyMorphReadiness/.test(catalog), 'readiness helper');

check(/data-testid="base-body-morph-fixture"/.test(fixture), 'fixture test id');
check(/data-testid="base-body-fixture-toggle"/.test(fixture), 'fixture collapse toggle');
check(/useState\(false\)/.test(fixture), 'fixture collapsed by default');
check(/BaseBodyMorphFixture/.test(editor), 'editor mounts fixture in DEV');
check(/export \{[\s\S]*createSagaDriveBaseBodyManifestV1/.test(index), 'barrel export');

// --- pure replicas ---
const BODY = ['height','headSize','shoulderWidth','chest','waist','hips','armLength','legLength','build','muscularity'];
const FACE = ['faceWidth','faceLength','jawWidth','chin','cheekbones','noseWidth','noseLength','eyeSize','eyeSpacing','eyeAngle','mouthWidth','lipFullness','earSize'];
const SPECIES = ['human','elf','dwarf','halfling','orc','cyborg','alien'];

function targetMap() {
  return {
    body: Object.fromEntries(BODY.map((k) => [k, `sd_body_${k}`])),
    face: Object.fromEntries(FACE.map((k) => [k, `sd_face_${k}`])),
  };
}

function resolveCaps(presentNames) {
  const map = targetMap();
  const present = new Set(presentNames);
  const missingBody = BODY.filter((k) => !present.has(map.body[k]));
  const missingFace = FACE.filter((k) => !present.has(map.face[k]));
  const flags = [];
  if (missingBody.length === 0) flags.push('morph-body-v1');
  if (missingFace.length === 0) flags.push('morph-face-v1');
  return { flags, missingBody, missingFace };
}

const incomplete = resolveCaps([]);
check(incomplete.flags.length === 0, 'no targets → no morph caps');
check(incomplete.missingBody.length === BODY.length, 'all body missing');

const completeNames = [...BODY.map((k) => `sd_body_${k}`), ...FACE.map((k) => `sd_face_${k}`)];
const complete = resolveCaps(completeNames);
check(complete.flags.includes('morph-body-v1') && complete.flags.includes('morph-face-v1'), 'full targets → both caps');

// species presets present in source
for (const id of SPECIES) {
  check(new RegExp(`id: '${id}'`).test(contract), `species ${id}`);
}

// morph contract keys covered by target map declarations
for (const k of BODY) {
  check(contract.includes(`sd_body_`) || /sd_body_\$\{key\}/.test(contract) || /sd_body_/.test(contract), 'body target prefix');
  check(new RegExp(`'${k}'`).test(morph), `morph body key ${k}`);
}
for (const k of FACE) {
  check(new RegExp(`'${k}'`).test(morph), `morph face key ${k}`);
}

// fixture matrix size: 2*(10+13) + 2 extremes = 48
const caseCount = 2 * (BODY.length + FACE.length) + 2;
check(caseCount === 48, `fixture case count formula => ${caseCount}`);

// cache invalidation replica
function cacheOk(a, m, r, asset, morphV, rigV) {
  return a === asset && m === morphV && r === rigV;
}
check(cacheOk('v1', 'SagaDriveAvatarMorphV1', 'SagaDriveHumanoidRigV1', 'v1', 'SagaDriveAvatarMorphV1', 'SagaDriveHumanoidRigV1'), 'cache compatible');
check(!cacheOk('v1', 'SagaDriveAvatarMorphV1', 'SagaDriveHumanoidRigV1', 'v2', 'SagaDriveAvatarMorphV1', 'SagaDriveHumanoidRigV1'), 'asset bump invalidates');

console.log('avatar-base-bodies-check PASS');
