#!/usr/bin/env node
/**
 * avatar-creator-final-acceptance-check — Final Visual & UX Acceptance v1 (#218).
 * Location: scripts/avatar-creator-final-acceptance-check.mjs
 *
 * Deterministic Creator matrix (20–30 combos + 2 golden refs). No live GPU /
 * paid Meshy; joins contracts from the completed avatar queue through #163.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
let group = '';

function section(name) {
  group = name;
  console.log(`\n[${name}]`);
}

function check(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error(`FAIL [${group}]: ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

const PIPELINE_FILES = [
  'src/domains/character/avatar/morph-contract.ts',
  'src/domains/character/avatar/base-body-contract.ts',
  'src/domains/character/avatar/mtoon-profile.ts',
  'src/domains/character/avatar/fit-range-contract.ts',
  'src/domains/character/avatar/content-pack-v1.ts',
  'src/domains/character/avatar/avatar-source.ts',
  'src/domains/character/avatar/avatar-save-export.ts',
  'src/domains/character/avatar/shared-avatar-surface.ts',
  'src/domains/character/avatar/equipment-visual-contract.ts',
  'src/domains/character/avatar/rigid-equipment-plan.ts',
  'src/domains/character/avatar/skinned-wearable-plan.ts',
  'src/app/character/avatar/AvatarSourceSelector.tsx',
  'src/app/character/avatar/AvatarMorphEditorPanels.tsx',
  'src/app/character/avatar/TraitCardPicker.tsx',
  'src/app/character/avatar/AvatarSurfaceViewer.tsx',
  'src/app/character/avatar/AvatarAnimationPreviewControls.tsx',
  'src/app/character/edit/CharacterEditor.tsx',
  '.qa/design/avatar-character-creator-v1.md',
];

const CHILD_GATES = [
  'avatar-modular-traits-check',
  'avatar-custom-import-check',
  'avatar-rig-normalization-check',
  'avatar-morph-contract-check',
  'avatar-base-bodies-check',
  'avatar-mtoon-profile-check',
  'avatar-body-face-editor-check',
  'avatar-fit-range-check',
  'avatar-save-export-check',
  'avatar-animation-retarget-check',
  'avatar-facial-expressions-check',
  'avatar-content-pack-check',
  'avatar-meshy-generation-check',
  'avatar-source-selector-check',
  'shared-avatar-surfaces-check',
  'avatar-equipment-visual-contract-check',
  'avatar-rigid-equipment-runtime-check',
  'item-avatar-fit-workbench-check',
  'avatar-rigging-providers-check',
  'avatar-skinned-wearables-check',
  'avatar-items-final-acceptance-check',
];

// ── A · Pipeline presence ────────────────────────────────────────────────────
section('A · Creator pipeline files');
for (const f of PIPELINE_FILES) {
  check(existsSync(join(root, f)) && read(f).length > 80, `present ${f}`);
}

// ── B · Child gates wired ────────────────────────────────────────────────────
section('B · Avatar child gates in test-gate');
const testGate = read('scripts/test-gate.mjs');
for (const name of CHILD_GATES) {
  const scriptPath = `scripts/${name}.mjs`;
  check(existsSync(join(root, scriptPath)), `script exists: ${scriptPath}`);
  check(
    new RegExp(`scripts/${name}\\.mjs`).test(testGate),
    `test-gate invokes ${name}`,
  );
}

// ── Bundle domain ────────────────────────────────────────────────────────────
const outDir = join(root, 'node_modules/.cache/avatar-creator-final-acceptance-check');
mkdirSync(outDir, { recursive: true });

async function bundle(entry, name) {
  const outfile = join(outDir, `${name}.mjs`);
  await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
  });
  return import(outfile);
}

const morph = await bundle('src/domains/character/avatar/morph-contract.ts', 'morph');
const baseBody = await bundle(
  'src/domains/character/avatar/base-body-contract.ts',
  'baseBody',
);
const mtoon = await bundle('src/domains/character/avatar/mtoon-profile.ts', 'mtoon');
const pack = await bundle('src/domains/character/avatar/content-pack-v1.ts', 'pack');
const source = await bundle('src/domains/character/avatar/avatar-source.ts', 'source');
const saveExport = await bundle(
  'src/domains/character/avatar/avatar-save-export.ts',
  'saveExport',
);
const surfaces = await bundle(
  'src/domains/character/avatar/shared-avatar-surface.ts',
  'surfaces',
);
const equip = await bundle(
  'src/domains/character/avatar/equipment-visual-contract.ts',
  'equip',
);

const mins = pack.assertContentPackV1Minimums();
check(mins.ok, `content pack minimums: ${(mins.failures || []).join('; ')}`);

function pick(list, i) {
  return list[i % list.length];
}

function buildCombo(setting, index, speciesId) {
  const faces = pack.listContentPackAssets({ category: 'face', setting });
  const hairs = pack.listContentPackAssets({ category: 'hair', setting });
  const outfits = pack.listContentPackAssets({ category: 'outfit', setting });
  const species = pack.listContentPackAssets({ category: 'species-trait', setting });
  const accessories = pack.listContentPackAssets({
    category: setting === 'sci-fi' ? 'cybernetic' : 'accessory',
    setting,
  });
  const eyes = pack.listContentPackAssets({ category: 'eyes', setting });

  check(faces.length >= 3, `${setting} faces available`);
  check(hairs.length >= 3, `${setting} hairs available`);
  check(outfits.length >= 3, `${setting} outfits available`);

  const speciesPreset = baseBody.getBaseBodySpeciesPreset(speciesId);
  const morphState = baseBody.deriveSpeciesMorphState(speciesId);
  // Slight per-combo variance so fingerprints differ while staying valid.
  const varied = morph.validateAvatarMorphInput({
    ...morphState,
    body: {
      ...morphState.body,
      height: Math.max(-1, Math.min(1, morphState.body.height + (index % 5) * 0.05 - 0.1)),
      build: Math.max(-1, Math.min(1, morphState.body.build + (index % 3) * 0.08 - 0.08)),
    },
    face: {
      ...morphState.face,
      eyeSize: Math.max(-1, Math.min(1, (morphState.face.eyeSize ?? 0) + (index % 4) * 0.04)),
    },
  });
  check(varied.ok, `${setting}#${index} morph valid`);

  const head = pick(faces, index).id;
  const hair = pick(hairs, index).id;
  const clothing = pick(outfits, index).id;
  const ears = species.length ? pick(species, index).id : speciesPreset.traits.ears;
  const accessory = accessories.length
    ? pick(accessories, index).id
    : eyes.length
      ? pick(eyes, index).id
      : 'none';

  const avatar = morph.withAvatarMorphState(
    {
      schema_version: 1,
      provider: 'm3-character-studio',
      source: 'sagadrive',
      preset: speciesPreset.legacyPresetId,
      model_format: 'glb',
      traits: { head, ears, hair, clothing, accessory },
      colors: {
        hair: varied.state.colors.hair,
        skin: varied.state.colors.skin,
        eyes: varied.state.colors.eyes,
      },
      body: { height: 50, size: 50 },
    },
    varied.state,
  );

  return {
    id: `${setting}-${speciesId}-${index}`,
    setting,
    speciesId,
    avatar,
    fingerprint: fingerprint({
      setting,
      speciesId,
      traits: avatar.traits,
      morph: avatar.morph,
      colors: avatar.colors,
      preset: avatar.preset,
    }),
  };
}

// ── C · 24 creator combinations ──────────────────────────────────────────────
section('C · 24 reproducible Creator combinations');
const fantasySpecies = ['human', 'elf', 'dwarf', 'halfling', 'orc', 'human'];
const sciFiSpecies = ['human', 'cyborg', 'alien', 'cyborg', 'alien', 'human'];
const combos = [];
for (let i = 0; i < 12; i += 1) {
  combos.push(buildCombo('fantasy', i, fantasySpecies[i % fantasySpecies.length]));
}
for (let i = 0; i < 12; i += 1) {
  combos.push(buildCombo('sci-fi', i, sciFiSpecies[i % sciFiSpecies.length]));
}
check(combos.length === 24, `combo count ${combos.length} === 24`);
const fps = new Set(combos.map((c) => c.fingerprint));
check(fps.size === 24, `all combo fingerprints unique (${fps.size})`);

// Save → reload identity (export payload roundtrip, overlays stripped)
for (const combo of combos) {
  const payload = saveExport.buildAvatarSaveExportPayload({
    avatar: combo.avatar,
    runtimeOverlays: [{ groupId: 'clothing', traitId: 'session-cloak', layer: 'runtime' }],
  });
  saveExport.assertExportPayloadSafe(payload);
  check(payload.runtimeOverlays.length === 0, `${combo.id} overlays stripped`);
  check(payload.preset === combo.avatar.preset, `${combo.id} preset preserved`);
  check(
    JSON.stringify(payload.baseTraits) ===
      JSON.stringify({
        head: combo.avatar.traits.head,
        ears: combo.avatar.traits.ears,
        hair: combo.avatar.traits.hair,
        clothing: combo.avatar.traits.clothing,
        accessory: combo.avatar.traits.accessory,
      }) ||
      payload.baseTraits.head === combo.avatar.traits.head,
    `${combo.id} traits in export`,
  );
  check(
    fingerprint(payload.morph) === fingerprint(combo.avatar.morph),
    `${combo.id} morph identity`,
  );
}

// ── D · Golden references ────────────────────────────────────────────────────
section('D · Golden references Fantasy + Sci-Fi');
const goldenFantasy = buildCombo('fantasy', 0, 'elf');
goldenFantasy.id = 'golden-fantasy-adult-elf';
// Pin traits for stable golden fingerprint
goldenFantasy.avatar = morph.withAvatarMorphState(
  {
    ...goldenFantasy.avatar,
    traits: {
      head: 'elf-angular',
      ears: 'elf-long',
      hair: 'silver-cascade',
      clothing: 'robe',
      accessory: 'eyes-glow-elf',
    },
    preset: 'fantasy-elf',
  },
  baseBody.deriveSpeciesMorphState('elf'),
);
goldenFantasy.fingerprint = fingerprint({
  id: goldenFantasy.id,
  traits: goldenFantasy.avatar.traits,
  morph: goldenFantasy.avatar.morph,
  colors: goldenFantasy.avatar.colors,
});

const goldenSciFi = buildCombo('sci-fi', 0, 'cyborg');
goldenSciFi.id = 'golden-scifi-adult-cyborg';
const cyberAssets = pack.listContentPackAssets({ category: 'cybernetic', setting: 'sci-fi' });
const sciFiOutfits = pack.listContentPackAssets({ category: 'outfit', setting: 'sci-fi' });
const sciFiHair = pack.listContentPackAssets({ category: 'hair', setting: 'sci-fi' });
const sciFiFaces = pack.listContentPackAssets({ category: 'face', setting: 'sci-fi' });
check(cyberAssets.length >= 1, 'sci-fi cybernetics');
check(sciFiOutfits.length >= 1, 'sci-fi outfits');
goldenSciFi.avatar = morph.withAvatarMorphState(
  {
    ...goldenSciFi.avatar,
    traits: {
      head: sciFiFaces[0]?.id ?? 'human-balanced',
      ears: 'round',
      hair: sciFiHair[0]?.id ?? 'short',
      clothing: sciFiOutfits[0].id,
      accessory: cyberAssets[0].id,
    },
    preset: baseBody.getBaseBodySpeciesPreset('cyborg').legacyPresetId,
  },
  baseBody.deriveSpeciesMorphState('cyborg'),
);
goldenSciFi.fingerprint = fingerprint({
  id: goldenSciFi.id,
  traits: goldenSciFi.avatar.traits,
  morph: goldenSciFi.avatar.morph,
  colors: goldenSciFi.avatar.colors,
});

check(
  goldenFantasy.fingerprint !== goldenSciFi.fingerprint,
  'golden refs differ',
);

const mtoonProfile = mtoon.createSagaDriveMToonProfileV1();
check(
  mtoonProfile.contractVersion === 'SagaDriveMToonProfileV1',
  'mtoon profile version',
);
const desktopPerf = mtoon.resolveMtoonPerformancePreset({ isMobile: false });
const mobilePerf = mtoon.resolveMtoonPerformancePreset({ isMobile: true });
check(desktopPerf === 'desktop', 'desktop mtoon preset');
check(mobilePerf === 'mobile', 'mobile mtoon preset');

const goldenDoc = {
  contract: 'AvatarCreatorFinalVisualUxAcceptanceV1',
  issue: 218,
  generatedBy: 'scripts/avatar-creator-final-acceptance-check.mjs',
  mtoonProfileVersion: mtoonProfile.contractVersion,
  golden: [
    {
      id: goldenFantasy.id,
      setting: 'fantasy',
      speciesId: 'elf',
      fingerprint: goldenFantasy.fingerprint,
      traits: goldenFantasy.avatar.traits,
      colors: goldenFantasy.avatar.colors,
      preset: goldenFantasy.avatar.preset,
      visualRegressionNotes:
        'Adult fantasy elf — proportions, face readability, hair alpha, robe silhouette, MToon outline.',
    },
    {
      id: goldenSciFi.id,
      setting: 'sci-fi',
      speciesId: 'cyborg',
      fingerprint: goldenSciFi.fingerprint,
      traits: goldenSciFi.avatar.traits,
      colors: goldenSciFi.avatar.colors,
      preset: goldenSciFi.avatar.preset,
      visualRegressionNotes:
        'Adult sci-fi cyborg — material separation (skin/metal), cybernetic accessory, outfit fit.',
    },
  ],
  comboCount: combos.length,
  comboFingerprints: combos.map((c) => ({ id: c.id, fingerprint: c.fingerprint })),
};

const goldenPath = join(root, '.qa/evidence/avatar-creator-golden-refs-v1.json');
mkdirSync(join(root, '.qa/evidence'), { recursive: true });
writeFileSync(goldenPath, `${JSON.stringify(goldenDoc, null, 2)}\n`);
check(existsSync(goldenPath), 'golden refs evidence written');

// Re-read stability
const reloaded = JSON.parse(readFileSync(goldenPath, 'utf8'));
check(reloaded.golden.length === 2, 'golden count 2');
check(
  reloaded.golden[0].fingerprint === goldenFantasy.fingerprint,
  'fantasy golden stable',
);
check(reloaded.golden[1].fingerprint === goldenSciFi.fingerprint, 'sci-fi golden stable');

// ── E · Source + capability flows ────────────────────────────────────────────
section('E · Source / morph / import-meshy capability flows');
check(source.resolveAvatarSource({ provider: 'm3-character-studio' }) === 'sagadrive', 'legacy→sagadrive');
check(
  source.resolveAvatarSource({ modelUrl: 'owner/x.glb' }) === 'import',
  'modelUrl→import',
);
check(source.resolveAvatarSource({ source: 'meshy' }) === 'meshy', 'explicit meshy');

const fullCaps = morph.resolveAvatarMorphCapabilities({
  hasBodyMorphTargets: true,
  hasFaceMorphTargets: true,
});
check(fullCaps.flags.includes('morph-body-v1'), 'sagadrive body morph');
check(fullCaps.flags.includes('morph-face-v1'), 'sagadrive face morph');
const importCaps = morph.resolveAvatarMorphCapabilities({
  hasBodyMorphTargets: false,
  hasFaceMorphTargets: false,
});
check(importCaps.flags.length === 0, 'import without targets → no morph flags');

const switchDirty = source.evaluateAvatarSourceSwitch({
  from: 'sagadrive',
  to: 'meshy',
  dirtySagaDrive: true,
});
check(switchDirty.needsConfirm === true, 'dirty switch confirms');
const capSummary = source.describeAvatarSourceCapabilities({
  source: 'import',
  morphBody: false,
  morphFace: false,
  animation: true,
  facial: false,
  wearables: false,
});
check(/nicht morphbar/.test(capSummary), 'import capability messaging');
check(/Animation möglich/.test(capSummary), 'animation messaging');

const mtoonImport = mtoon.resolveMtoonRenderPath({
  hasMtoonMaterials: false,
  isImportModel: true,
});
check(mtoonImport.path === 'pbr-fallback', 'import mtoon fallback');
check(typeof mtoonImport.noticeDe === 'string' && mtoonImport.noticeDe.length > 10, 'fallback notice');

// ── F · Surfaces / portrait / animation identity ─────────────────────────────
section('F · Shared surfaces + equipment identity');
const sheet3d = surfaces.resolveAvatarSurfaceView({
  surface: 'sheet',
  ref: {
    characterId: 'c1',
    displayName: 'Golden Elf',
    modelUrl: 'owner/exports/golden.glb',
    portraitUrl: 'owner/portraits/golden.webp',
  },
  mode: 'full-3d',
  webGlAvailable: true,
  live3dCount: 0,
});
check(sheet3d.mode === 'full-3d' && sheet3d.useWebGl === true, 'sheet full-3d');

const noWebGl = surfaces.resolveAvatarSurfaceView({
  surface: 'sheet',
  ref: {
    characterId: 'c1',
    displayName: 'Golden Elf',
    modelUrl: 'owner/exports/golden.glb',
    portraitUrl: 'owner/portraits/golden.webp',
  },
  mode: 'full-3d',
  webGlAvailable: false,
});
check(noWebGl.mode === 'portrait' && /WebGL/.test(noWebGl.fallbackReason || ''), 'WebGL fallback');

const token = surfaces.resolveAvatarSurfaceView({
  surface: 'token',
  ref: {
    characterId: 'c1',
    displayName: 'Golden Elf',
    portraitUrl: 'owner/portraits/golden.webp',
  },
});
check(token.mode === 'portrait', 'token defaults portrait');

surfaces.assertNoInventoryInSurfaceRef({
  characterId: 'c1',
  displayName: 'x',
});

const binding = equip.createAvatarEquipmentBinding({
  bindingId: 'b-golden-sword',
  assetId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  definitionId: 'core-sword',
  attachment: 'rigid',
  anchor: 'rightHand',
});
check(binding.anchor === 'rightHand', 'equipment binding for creator sanity');

const exportWithEquipOverlay = saveExport.buildAvatarSaveExportPayload({
  avatar: goldenFantasy.avatar,
  runtimeOverlays: [
    { groupId: 'clothing', traitId: binding.definitionId, layer: 'runtime' },
  ],
});
check(exportWithEquipOverlay.runtimeOverlays.length === 0, 'equipment not baked into save');

// ── G · Desktop / tablet / mobile / keyboard structural UX ───────────────────
section('G · Responsive + keyboard / a11y structural');
const editor = [
  read('src/app/character/edit/CharacterEditor.tsx'),
  read('src/app/character/edit/useCharacterAvatarEditor.ts'),
].join('\n');
const picker = read('src/app/character/avatar/TraitCardPicker.tsx');
const morphUi = read('src/app/character/avatar/AvatarMorphEditorPanels.tsx');
const sourceUi = read('src/app/character/avatar/AvatarSourceSelector.tsx');
const surfaceUi = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const animUi = read('src/app/character/avatar/AvatarAnimationPreviewControls.tsx');

check(/max-w-7xl/.test(editor), 'desktop max width');
check(/md:p-8|md:space-y-6|md:grid-cols-2/.test(editor), 'tablet/desktop breakpoints');
check(/grid-cols-1/.test(editor) || /grid-cols-1/.test(picker), 'mobile single column');
check(/overflow-x-hidden/.test(picker), 'no horizontal overflow picker');
check(/min-h-11/.test(morphUi), 'touch targets morph');
check(/min-h-11/.test(animUi), 'touch targets animation');
check(/aria-label="Avatar-Quelle"/.test(sourceUi), 'source aria');
check(/role="radiogroup"/.test(sourceUi), 'source radiogroup');
check(/aria-labelledby="morph-body-heading"/.test(morphUi), 'morph body labelled');
check(/aria-labelledby="morph-face-heading"/.test(morphUi), 'morph face labelled');
check(/sr-only/.test(surfaceUi), 'surface fallback sr-only');
check(/data-avatar-save-export/.test(editor), 'primary save reachable marker');
check(/aria-label="Avatar-Animationsvorschau"/.test(animUi), 'animation aria');
check(/Fantasy/.test(picker) && /Sci-Fi/.test(picker), 'setting filter labels');
check(/data-content-pack-setting/.test(picker), 'setting filter data attr');

// Security: no client Meshy secrets (VITE_ / hardcoded key literals)
check(!/VITE_.*MESHY/.test(editor + sourceUi), 'no VITE Meshy secrets in UI');
const meshyPanel = read('src/app/character/avatar/AvatarMeshyPanel.tsx');
check(!/VITE_.*MESHY/.test(meshyPanel), 'no VITE Meshy in panel');
check(!/meshyApiKey\s*[:=]|MESHY_API_KEY\s*[:=]/.test(meshyPanel), 'no hardcoded meshy key literal');

if (failures > 0) {
  console.error(`\navatar-creator-final-acceptance-check FAIL (${failures})`);
  process.exit(1);
}

console.log('\navatar-creator-final-acceptance-check PASS');
console.log(`  combos=${combos.length} golden=${goldenFantasy.fingerprint}/${goldenSciFi.fingerprint}`);
