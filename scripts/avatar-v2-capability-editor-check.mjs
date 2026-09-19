#!/usr/bin/env node
/**
 * avatar-v2-capability-editor-check — deterministic tests for #259.
 * Location: scripts/avatar-v2-capability-editor-check.mjs
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-v2-capability-editor-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/editor-surface-resolver-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const source = read('src/domains/character/avatar/avatar-source.ts');
const hookComp = read('src/app/character/avatar/useAvatarComposition.ts');
const hookSurf = read('src/app/character/avatar/useAvatarEditorSurfaces.ts');

check(/resolveAvatarEditorSurfaces/.test(domain), 'domain resolver export');
check(/resolveMorphEvidenceForComposition/.test(domain), 'morph evidence resolver');
check(!/from ['"]react['"]/.test(domain), 'domain no React');
check(!/AvatarSource/.test(domain) || /never/.test(domain.toLowerCase()), 'domain avoids source unlock');
check(!/\bsource\s*===\s*['"]sagadrive['"]/.test(domain), 'domain no source===sagadrive gate');
check(/resolveAvatarEditorSurfaces/.test(index), 'barrel export resolver');
check(/useAvatarComposition/.test(hookComp), 'composition hook');
check(/useAvatarEditorSurfaces/.test(hookSurf), 'surfaces hook');
check(/useAvatarEditorSurfaces/.test(editor), 'CharacterEditor uses surfaces hook');
check(/useAvatarComposition/.test(editor), 'CharacterEditor uses composition hook');
check(!/avatarSource === 'sagadrive' && !importedModelUrl/.test(editor), 'no legacy morph source gate');
check(!/disabled=\{saving \|\| avatarSource !== 'sagadrive'\}/.test(editor), 'no morph disabled by source');
check(!/if \(avatarSource !== 'sagadrive'\) return;/.test(editor), 'no trait source gate');
check(!/#6/.test(editor), 'CharacterEditor end-user copy has no #6');
check(!/#6/.test(source.split('export const AVATAR_SOURCE_OPTIONS')[1] ?? ''), 'avatar-source option copy has no #6');
check(!/Rig-Analyse \(#6\)/.test(read('src/app/character/avatar/AvatarMeshyPanel.tsx')), 'meshy panel copy sanitized');

const outDir = join(root, 'node_modules/.cache/avatar-v2-capability-editor-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'editor-surfaces.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/editor-surface-resolver-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile);

// Native catalog fixture (composition axes, not source)
const native = m.resolveEditorSurfacesFromAvatarState({
  composition: { anatomy: 'humanoid', modularity: 'modular-parts' },
  hasExternalModel: false,
});
check(native.status === 'ready', 'native ready');
check(native.surfaces.morphBody && native.surfaces.morphFace, 'native morphs');
check(native.surfaces.traits && native.surfaces.clothing && native.surfaces.colors, 'native traits/colors');
check(native.morphFlags.includes('morph-body-v1'), 'native morph-body flag');

// Import pending (no inspection yet)
const importPending = m.resolveEditorSurfacesFromAvatarState({
  composition: { anatomy: 'unknown', modularity: 'limited' },
  hasExternalModel: true,
  inspected: null,
});
check(importPending.status === 'pending', 'import pending');
check(!importPending.surfaces.morphBody && !importPending.surfaces.traits, 'import pending no surfaces');

// Generate with morph evidence (fixture)
const generateReady = m.resolveEditorSurfacesFromAvatarState({
  composition: { anatomy: 'humanoid', modularity: 'limited' },
  hasExternalModel: true,
  inspected: { hasBodyMorphTargets: true, hasFaceMorphTargets: true },
});
check(generateReady.surfaces.morphBody && generateReady.surfaces.morphFace, 'generate morph from evidence');
check(!generateReady.surfaces.traits, 'generate limited modularity → no traits');

// Custom creature — no humanoid morph sliders
const creature = m.resolveEditorSurfacesFromAvatarState({
  composition: { anatomy: 'custom-creature', modularity: 'limited' },
  hasExternalModel: true,
  inspected: { hasBodyMorphTargets: true, hasFaceMorphTargets: true },
});
check(!creature.surfaces.morphBody && !creature.surfaces.morphFace, 'creature no morph');
check(creature.limitations.length > 0, 'creature explains limitation');

// Source string must never appear as unlock key in summary for pending
check(!/#\d+/.test(native.summaryDe), 'summary has no ticket shorthand');
check(!/#\d+/.test(importPending.summaryDe), 'pending summary no ticket shorthand');

// Equipment from rig flags only
const withEquip = m.resolveAvatarEditorSurfaces({
  composition: { anatomy: 'humanoid', modularity: 'modular-parts' },
  morphFlags: ['morph-body-v1'],
  rigFlags: ['skinned-wearable-ready'],
  status: 'ready',
});
check(withEquip.surfaces.equipment, 'equipment from rig flag');

const noEquip = m.resolveAvatarEditorSurfaces({
  composition: { anatomy: 'humanoid', modularity: 'modular-parts' },
  morphFlags: ['morph-body-v1'],
  rigFlags: [],
  status: 'ready',
});
check(!noEquip.surfaces.equipment, 'no equipment without rig flag');

check(existsSync(join(root, '.qa/acceptance/avatar-v2-capability-editor.md')), 'acceptance exists');

console.log('avatar-v2-capability-editor-check OK');
