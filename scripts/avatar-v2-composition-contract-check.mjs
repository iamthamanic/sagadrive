#!/usr/bin/env node
/**
 * avatar-v2-composition-contract-check — deterministic tests for #249.
 * Location: scripts/avatar-v2-composition-contract-check.mjs
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
    console.error(`avatar-v2-composition-contract-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const design = join(root, '.qa/design/avatar-v2-modular-pipeline.md');
check(existsSync(design), 'design SoT exists');
const designText = read('.qa/design/avatar-v2-modular-pipeline.md');
check(/Glossar/.test(designText), 'design has glossary');
check(/Standard \/ Compact \/ Heavy/.test(designText) || /Standard\/Compact\/Heavy/.test(designText), 'design body families');
check(/Custom Creature/.test(designText), 'design custom creatures');
check(/provider-neutral|Provider-Abstraktion/.test(designText), 'design provider abstraction');
check(/fail-closed|Fail-closed/.test(designText), 'design fail-closed');
check(/CharacterAvatarDto/.test(designText), 'design mentions legacy DTO');

const domain = read('src/domains/character/avatar/composition-contract-v2.ts');
const index = read('src/domains/character/avatar/index.ts');
check(/AVATAR_V2_COMPOSITION_CONTRACT_VERSION/.test(domain), 'contract version');
check(/compositionFromCharacterAvatarDto/.test(domain), 'legacy mapper');
check(/toAvatarV2Source/.test(domain), 'source mapping');
check(/parseAvatarV2CompositionFields/.test(domain), 'fail-closed parse');
check(!/from ['"]react['"]/.test(domain), 'domain no React');
check(!/from ['"]three['"]/.test(domain), 'domain no Three');
check(!/supabase|@mediapipe/.test(domain), 'domain no infra');
check(/compositionFromCharacterAvatarDto/.test(index), 'barrel export mapper');
check(/AVATAR_V2_COMPOSITION_CONTRACT_VERSION/.test(index), 'barrel export version');

const outDir = join(root, 'node_modules/.cache/avatar-v2-composition-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'composition-v2.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/composition-contract-v2.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const c = await import(outfile);

check(c.toAvatarV2Source('meshy') === 'generate', 'meshy → generate');
check(c.toAvatarV2Source('import') === 'import', 'import stays');
check(c.toAvatarV2Source('sagadrive') === 'sagadrive', 'sagadrive stays');

const parsedBad = c.parseAvatarV2CompositionFields({
  anatomy: 'dragon',
  bodyFamily: 'fantasy-elf',
  bodyCompatibility: 'nope',
  modularity: 'full',
  capabilities: ['humanoid', 'meshy', 12],
});
check(parsedBad.anatomy === 'unknown', 'bad anatomy → unknown');
check(parsedBad.bodyFamily === 'custom', 'bad family → custom');
check(parsedBad.bodyCompatibility === 'unknown', 'bad compat → unknown');
check(parsedBad.modularity === 'limited', 'bad modularity → limited');
check(parsedBad.capabilities.length === 1 && parsedBad.capabilities[0] === 'humanoid', 'only valid caps');

const legacyMeshy = c.compositionFromCharacterAvatarDto({
  schema_version: 1,
  provider: 'm3-character-studio',
  source: 'meshy',
  preset: 'fantasy-elf',
  model_format: 'glb',
  model_url: 'https://example.invalid/x.glb',
  traits: {},
  colors: { hair: '#000', skin: '#fff' },
  body: { height: 50, size: 50 },
});
check(legacyMeshy.source === 'generate', 'legacy meshy → generate');
check(legacyMeshy.legacySource === 'meshy', 'legacy source retained');
check(legacyMeshy.species === 'fantasy-elf', 'species from preset');
check(legacyMeshy.capabilities.length === 0, 'source alone → no capabilities');
check(legacyMeshy.bodyFamily === 'custom', 'no forced family');
c.assertCompositionCapabilitiesNotFromSource(legacyMeshy);
c.assertSpeciesOrthogonalToBodyFamily(legacyMeshy);

const saga = c.compositionFromCharacterAvatarDto({
  schema_version: 1,
  provider: 'm3-character-studio',
  source: 'sagadrive',
  preset: 'fantasy-human',
  model_format: 'vrm',
  traits: { hair: 'short' },
  colors: { hair: '#000', skin: '#fff' },
  body: { height: 50, size: 50 },
});
check(saga.anatomy === 'humanoid', 'sagadrive catalog → humanoid');
check(saga.modularity === 'modular-parts', 'sagadrive modular baseline');
check(saga.capabilities.length === 0, 'still no caps without analysis');

const withAnalysis = c.compositionFromCharacterAvatarDto(saga, ['rigged', 'humanoid']);
check(withAnalysis.capabilities.includes('humanoid'), 'analysis caps applied');

check(
  c.AVATAR_V2_COMPOSITION_CONTRACT_VERSION === 'SagaDriveAvatarCompositionV2',
  'version const',
);

console.log('avatar-v2-composition-contract-check PASS');
