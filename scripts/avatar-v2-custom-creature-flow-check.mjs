#!/usr/bin/env node
/**
 * avatar-v2-custom-creature-flow-check — deterministic tests for #266.
 * Location: scripts/avatar-v2-custom-creature-flow-check.mjs
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
    console.error(`avatar-v2-custom-creature-flow-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/custom-creature-flow-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const panel = read('src/app/character/avatar/AvatarImportPanel.tsx');
const guidance = read('src/app/character/avatar/AvatarCustomCreatureGuidance.tsx');
const conversion = read('src/app/character/avatar/AvatarBodyConversionPanel.tsx');
const editor = [
  read('src/app/character/edit/CharacterEditor.tsx'),
  read('src/app/character/edit/useCharacterAvatarEditor.ts'),
].join('\n');

check(/CUSTOM_CREATURE_FLOW_CONTRACT_VERSION/.test(domain), 'contract version');
check(/runFarukLikeOriginalKeepSlice/.test(domain), 'faruk slice');
check(/allowHumanoidMorph:\s*false/.test(domain), 'no morph force');
check(/humanoide Interpretation/.test(domain), 'interpretation copy');
check(/Kleidung/.test(domain), 'wardrobe copy');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/buildCustomCreatureFlowGuidance/.test(index), 'barrel guidance');
check(/runFarukLikeOriginalKeepSlice/.test(index), 'barrel slice');
check(/resolveCustomRigBenchmarkDecision/.test(index), 'bench barrel (#265)');
check(/AvatarCustomCreatureGuidance/.test(panel), 'panel wires guidance');
check(/data-avatar-custom-recommend-original/.test(guidance), 'recommend original UI');
check(/data-avatar-custom-wardrobe-limit/.test(guidance), 'wardrobe UI');
check(/Humanoide Interpretation/.test(conversion), 'conversion warn');
check(/custom-creature/.test(editor) && /Humanoid-Morph/.test(editor), 'editor keep toast');
check(
  existsSync(join(root, 'fixtures/avatar-v2/golden/rig-profile-faruk-like.json')),
  'faruk fixture',
);
check(
  existsSync(join(root, 'fixtures/avatar-v2/structure-custom-creature.json')),
  'structure fixture',
);

const outDir = join(root, 'node_modules/.cache/avatar-v2-custom-creature-flow-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'flow.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/custom-creature-flow-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertCustomCreatureFlowInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const slice = m.runFarukLikeOriginalKeepSlice();
check(slice.summary.flowStatus === 'ready-custom', 'ready-custom');
check(slice.summary.canKeepOriginal === true, 'can keep');
check(slice.keepSeed.bodyFamily === 'custom', 'keep custom');
check(slice.editorSeed.allowHumanoidMorph === false, 'seed no morph');
check(slice.morphEvidenceEmpty === true, 'morph empty');
check(slice.editorSeed.capabilities.length === 0, 'caps empty');

const g = m.buildCustomCreatureFlowGuidance();
check(g.recommendOriginal === true, 'recommend');
check(g.preferredRigPath === 'import-existing-rig', 'prefer import-existing');
check(g.autoRigOptional === true, 'auto-rig optional');

check(existsSync(join(root, '.qa/acceptance/avatar-v2-custom-creature-flow.md')), 'acceptance');
console.log('avatar-v2-custom-creature-flow-check PASS');
