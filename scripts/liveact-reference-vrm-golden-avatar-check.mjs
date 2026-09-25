#!/usr/bin/env node
/**
 * liveact-reference-vrm-golden-avatar-check — Golden Reference VRM integration.
 * Location: scripts/liveact-reference-vrm-golden-avatar-check.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-reference-vrm-golden-avatar-check FAIL: ${msg}`);
    process.exit(1);
  }
}

async function bundle(entryRel, outName) {
  const outfile = join(root, '.qa/runs', outName);
  await build({
    entryPoints: [join(root, entryRel)],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile,
    write: true,
    logLevel: 'silent',
  });
  return outfile;
}

const domain = read('src/domains/character/avatar/liveact-golden-reference-avatar-v1.ts');
const models = read('src/domains/character/avatar/species-template-models-v1.ts');
const hook = read('src/app/character/edit/useCharacterAvatarEditor.ts');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const ui = read('src/app/character/avatar/HumanLiveActMeshVariantSelect.tsx');
const picker = read('src/app/character/avatar/AvatarSpeciesTemplatePicker.tsx');
const aliases = read('src/domains/character/liveact/liveact-channel-target-aliases.ts');
const vrmOut = read('src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts');
const retarget = read('src/domains/character/liveact/liveact-retarget-profile.ts');
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const caps = read('src/domains/character/liveact/liveact-capabilities.ts');
const inspector = read('src/app/character/liveact/LiveActCapabilityInspector.tsx');
const fixture = JSON.parse(
  read('.qa/fixtures/liveact-reference-vrm/expression-inventory.json'),
);
const acceptance = read('.qa/acceptance/liveact-reference-vrm-golden-avatar.md');
const design = read('.qa/design/liveact-reference-vrm-golden-avatar.md');
const attribution = read('public/assets/avatars/reference/ATTRIBUTION.md');
const gate = read('scripts/test-gate.mjs');
const fetchScript = read('scripts/fetch-liveact-reference-vrm.mjs');

check(/reference-vrm-arkit52/.test(domain), 'golden id');
check(/valid-white-m1-default\.vrm/.test(domain), 'public path');
check(/3a79e95bc81655a3e1ec020538c67e7e17551b6f/.test(domain), 'pinned commit');
check(/CC-BY-4\.0/.test(domain), 'license in domain');
check(/human-male-quality-20260921-m5-face1\.vrm/.test(models), 'SagaDrive human unchanged');
check(/LIVEACT_GOLDEN_REFERENCE_AVATAR_ID/.test(hook), 'hook wires reference');
check(/avatarForPersist/.test(hook), 'persist strips reference URL');
check(/human-mesh-variant-slot/.test(picker), 'picker hosts human mesh slot above grid');
check(/HumanLiveActMeshVariantSelect/.test(editor), 'editor hosts select');
check(/humanMeshSlot/.test(editor), 'editor passes humanMeshSlot');
check(/hintDe/.test(ui), 'UI renders variant hint');
check(/Nur für LiveAct-Diagnose/.test(domain), 'diagnostic hint');
check(/Mensch — Mesh-Vorlage/.test(ui), 'visible mesh template label');
check(/blinkLeft/.test(aliases), 'generic blink alias remains');
check(!/TLTMedia|White_M_1|valid-white-m1|reference-vrm-arkit52/.test(aliases), 'no asset id in aliases');
check(!/TLTMedia|White_M_1|valid-white-m1|reference-vrm-arkit52/.test(retarget), 'no asset id in retarget');
check(!/TLTMedia|White_M_1|valid-white-m1|reference-vrm-arkit52/.test(engine), 'no asset id in engine');
check(!/TLTMedia|White_M_1|valid-white-m1|reference-vrm-arkit52/.test(vrmOut), 'no asset id in VRM output');
check(/gazeDrivePath/.test(caps), 'capabilities expose gaze path');
check(/liveact-capability-gaze-path/.test(inspector), 'inspector shows gaze path');
check(fixture.expectedGazePath === 'lookAt', 'fixture expects lookAt');
check(fixture.vrmCustomExpressionNames.includes('jawOpen'), 'fixture jawOpen');
check(fixture.vrmPresetExpressionNames.includes('blinkLeft'), 'fixture blinkLeft');
check(/Fall A|Fall B|Fall C|Fall D/.test(design), 'interpretation cases');
check(/CC BY 4\.0/.test(attribution), 'attribution license');
check(/fetch-liveact-reference-vrm/.test(fetchScript), 'fetch script');
check(/checkLiveActReferenceVrmGoldenAvatar/.test(gate), 'test-gate wiring');
check(/Golden Reference/.test(acceptance), 'acceptance present');

const aliasOut = await bundle(
  'src/domains/character/liveact/liveact-channel-target-aliases.ts',
  'liveact-golden-reference-aliases-bundle.mjs',
);
const aliasMod = await import(aliasOut + `?t=${Date.now()}`);
const present = [
  ...fixture.vrmPresetExpressionNames,
  ...fixture.vrmCustomExpressionNames,
];
const resolution = aliasMod.resolveLiveActChannelTargets(present);
for (const id of [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
  'browInnerUp',
]) {
  check(resolution.faceSupport[id] === true, `resolves ${id}`);
}
check(resolution.resolvedNames.eyeBlinkLeft === 'blinkLeft', 'blinkLeft alias');

const gazeOut = await bundle(
  'src/domains/character/liveact/liveact-gaze-path.ts',
  'liveact-golden-reference-gaze-bundle.mjs',
);
const gazeMod = await import(gazeOut + `?t=${Date.now()}`);
const path = gazeMod.resolveLiveActGazeDrivePath({
  hasEyeBones: false,
  hasLookAt: true,
  hasEyeLookMorphs: false,
});
check(path === 'lookAt', 'single gaze path lookAt for reference capabilities');

// Overlay points: committed sidecar, auto/unreviewed, generic morph seed, never persisted.
const sidecarRel = 'public/assets/avatars/reference/valid-white-m1-default-face-anchors.json';
check(existsSync(join(root, sidecarRel)), 'reference face-anchors sidecar committed');
const sidecar = JSON.parse(read(sidecarRel));
check(sidecar.contractVersion === 'SagaDriveFaceAnchorsV1', 'sidecar contract version');
check(Object.keys(sidecar.anchors ?? {}).length === 21, 'sidecar has all 21 anchors');
const authoring = JSON.parse(
  read('public/assets/avatars/reference/valid-white-m1-default-face-mapping-authoring.json'),
);
check(authoring.source === 'auto' && authoring.reviewed === false, 'sidecar marked auto/unreviewed');

const morphSeed = read('scripts/lib/liveact-face-anchor-morph-seed.mjs');
check(
  !/valid-white|White_M|TLTMedia|reference-vrm|H_DDS/i.test(morphSeed),
  'morph seed has no asset-specific names',
);

const avatarEditorHook = read('src/app/character/edit/useCharacterAvatarEditor.ts');
check(
  /face_anchors:\s*_referenceAnchors/.test(avatarEditorHook),
  'avatarForPersist strips reference face_anchors',
);
check(
  /if \(useGoldenReference\) \{\s*setReferenceFaceAnchorsManifest\(manifest\)/.test(avatarEditorHook),
  'Face Setup on reference stays session-only',
);
check(
  !/next === LIVEACT_GOLDEN_REFERENCE_AVATAR_ID\) \{\s*[^}]*setFaceAnchorsManifest\(null\)/.test(avatarEditorHook),
  'switching to reference keeps SagaDrive face mapping',
);

const binary = join(root, 'public/assets/avatars/reference/valid-white-m1-default.vrm');
if (!existsSync(binary)) {
  console.warn(
    'liveact-reference-vrm-golden-avatar-check WARN: binary missing — run node scripts/fetch-liveact-reference-vrm.mjs',
  );
} else {
  const { validateFaceAnchorsManifestFile } = await import('./lib/liveact-face-anchor-validate.mjs');
  const bound = await validateFaceAnchorsManifestFile({
    manifestPath: join(root, sidecarRel),
    glbPath: binary,
  });
  check(bound.ok, `sidecar binds to reference VRM (${(bound.errors ?? []).join(', ')})`);
}

console.log('liveact-reference-vrm-golden-avatar-check OK');
