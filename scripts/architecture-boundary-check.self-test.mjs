#!/usr/bin/env node
/**
 * architecture-boundary-check.self-test — Deterministic fixtures for boundary rules.
 * Location: scripts/architecture-boundary-check.self-test.mjs
 */
import process from 'node:process';
import {
  checkAllowedSrcCodeRoots,
  checkAppCrossAreaImports,
  checkCharacterCrossSliceImports,
  checkContentImportPaths,
  checkEradicatedLegacyRoots,
  checkLegacyFreeze,
  extractImportPaths,
  resolveRelativeImport,
  runArchitectureBoundaryCheck,
} from './architecture-boundary-check.mjs';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function assertViolation(label, filePath, content, expectedRuleFragment) {
  const violations = checkCharacterCrossSliceImports(filePath, content);
  assert(
    violations.some((entry) => entry.rule.includes(expectedRuleFragment)),
    `${label}: expected violation containing "${expectedRuleFragment}", got ${JSON.stringify(violations)}`,
  );
}

function assertNoCrossSliceViolation(label, filePath, content) {
  const violations = checkCharacterCrossSliceImports(filePath, content);
  assert(violations.length === 0, `${label}: expected no cross-slice violations, got ${JSON.stringify(violations)}`);
}

assertViolation(
  'private cross-slice import (slice root)',
  '/repo/src/app/character/edit/CharacterEditor.tsx',
  "import { Foo } from '../creation/CharacterArchetypePanel';",
  'private cross-slice import',
);

assertViolation(
  'private cross-slice import (nested file)',
  '/repo/src/app/character/edit/components/Header.tsx',
  "import { Foo } from '../../creation/CharacterArchetypePanel';",
  'private cross-slice import',
);

assertNoCrossSliceViolation(
  'public slice import (slice root)',
  '/repo/src/app/character/edit/CharacterEditor.tsx',
  "import { CharacterArchetypePanel } from '../creation';",
);

assertNoCrossSliceViolation(
  'public slice import (nested file)',
  '/repo/src/app/character/edit/components/Header.tsx',
  "import { CharacterArchetypePanel } from '../../creation';",
);

assertViolation(
  'slice barrel private re-export',
  '/repo/src/app/character/progression/index.ts',
  "export { Foo } from '../creation/CharacterArchetypePanel';",
  'private cross-slice import',
);

assertNoCrossSliceViolation(
  'slice barrel own-slice re-export',
  '/repo/src/app/character/creation/index.ts',
  "export { CharacterArchetypePanel } from './CharacterArchetypePanel';",
);

assertNoCrossSliceViolation(
  'slice barrel allowed public re-export',
  '/repo/src/app/character/edit/index.ts',
  "export { CharacterArchetypePanel } from '../creation';",
);

assertNoCrossSliceViolation(
  'slice barrel inventory non-slice path',
  '/repo/src/app/character/progression/index.ts',
  "export { CharacterInventoryV2Panel } from '../inventory/CharacterInventoryV2Panel';",
);

const dynamicSupabase = "const client = await import('../../../lib/supabase');";
const appDynamicViolations = checkContentImportPaths(
  dynamicSupabase,
  [
    { label: 'Supabase client', test: (p) => p.includes('supabase') },
    { label: 'Supabase lib', test: (p) => /(?:^|\/)lib\/supabase(?:\.|$)/.test(p) },
  ],
  'app',
  'src/app/character/edit/CharacterEditor.tsx',
);
assert(
  appDynamicViolations.some((entry) => entry.rule.includes('Supabase')),
  `dynamic supabase import should fail, got ${JSON.stringify(appDynamicViolations)}`,
);

assert(
  extractImportPaths(dynamicSupabase).includes('../../../lib/supabase'),
  'extractImportPaths should capture dynamic imports',
);

assert(
  resolveRelativeImport('/repo/src/app/character/edit/components/Panel.tsx', '../../creation/Foo').endsWith(
    'app/character/creation/Foo',
  ),
  'resolveRelativeImport should normalize nested cross-slice paths',
);

const domainReactViolations = checkContentImportPaths(
  "import { useState } from 'react';",
  [{ label: 'React', test: (p) => /^react(?:\/|$)/.test(p) }],
  'domains',
  'src/domains/character/example.ts',
);
assert(domainReactViolations.length === 1, 'domain React import should fail');

const domainSharedUiRules = [
  { label: 'UI components', test: (p) => p.includes('/components/') },
  { label: 'Shared UI', test: (p) => /(?:^|\/)shared\/ui(?:\/|$)/.test(p) || p.includes('@/shared/ui') },
];
assert(
  checkContentImportPaths(
    "import { Button } from '../../shared/ui/button';",
    domainSharedUiRules,
    'domains',
    'src/domains/character/example.ts',
  ).some((v) => v.rule === 'Shared UI'),
  'domain → shared/ui relative must fail',
);
assert(
  checkContentImportPaths(
    "import { Button } from '@/shared/ui/button';",
    domainSharedUiRules,
    'domains',
    'src/domains/character/example.ts',
  ).some((v) => v.rule === 'Shared UI'),
  'domain → @/shared/ui must fail',
);

assert(
  extractImportPaths("const m = await import(`@/app/project/hooks/useProjects`);").includes(
    '@/app/project/hooks/useProjects',
  ),
  'extractImportPaths should capture static template-literal dynamic imports',
);
assert(
  !extractImportPaths("const m = await import(`@/app/${name}`);").length,
  'extractImportPaths should ignore interpolated template dynamic imports',
);

assert(
  checkLegacyFreeze(
    ['src/modules/characters/foo.ts', 'src/modules/characters/bar.ts'],
    ['src/modules/characters/foo.ts'],
  ).some((v) => v.file === 'src/modules/characters/bar.ts'),
  'legacy freeze must reject paths absent from baseline',
);

assert(
  checkLegacyFreeze(['src/modules/characters/foo.ts'], [
    'src/modules/characters/foo.ts',
    'src/modules/characters/old.ts',
  ]).length === 0,
  'legacy freeze must allow deletions relative to baseline',
);

assert(
  checkLegacyFreeze(['src/components/BrandNewScreen.tsx'], []).some((v) =>
    v.file.includes('BrandNewScreen'),
  ),
  'legacy freeze must reject new feature screens under src/components/**',
);

assert(
  checkEradicatedLegacyRoots().length === 0,
  'live repo must not contain src/modules or src/components',
);

const privateCrossArea = checkAppCrossAreaImports(
  '/repo/src/app/character/edit/CharacterBackgroundComposer.tsx',
  "import { useProjects } from '../../project/hooks/useProjects';",
);
assert(
  privateCrossArea.some((v) => v.rule.includes('private cross-area import')),
  `private cross-area import must fail, got ${JSON.stringify(privateCrossArea)}`,
);

const aliasPrivateCrossArea = checkAppCrossAreaImports(
  '/repo/src/app/character/edit/CharacterBackgroundComposer.tsx',
  "import { useProjects } from '@/app/project/hooks/useProjects';",
);
assert(
  aliasPrivateCrossArea.some((v) => v.rule.includes('private cross-area import')),
  `@/ alias private cross-area import must fail, got ${JSON.stringify(aliasPrivateCrossArea)}`,
);

const publicCrossArea = checkAppCrossAreaImports(
  '/repo/src/app/character/edit/CharacterBackgroundComposer.tsx',
  "import { useProjects } from '../../project';",
);
assert(
  publicCrossArea.length === 0,
  `public area barrel must pass, got ${JSON.stringify(publicCrossArea)}`,
);

const aliasPublicCrossArea = checkAppCrossAreaImports(
  '/repo/src/app/character/edit/CharacterBackgroundComposer.tsx',
  "import { useProjects } from '@/app/project';",
);
assert(
  aliasPublicCrossArea.length === 0,
  `@/ public area barrel must pass, got ${JSON.stringify(aliasPublicCrossArea)}`,
);

const areaBarrelPrivateCross = checkAppCrossAreaImports(
  '/repo/src/app/character/index.ts',
  "export { useProjects } from '../project/hooks/useProjects';",
);
assert(
  areaBarrelPrivateCross.some((v) => v.rule.includes('private cross-area import')),
  `area barrel must not re-export other areas' private paths, got ${JSON.stringify(areaBarrelPrivateCross)}`,
);

const areaBarrelOwnInternals = checkAppCrossAreaImports(
  '/repo/src/app/character/index.ts',
  "export { useCharacters } from './list';",
);
assert(
  areaBarrelOwnInternals.length === 0,
  `area barrel may re-export own internals, got ${JSON.stringify(areaBarrelOwnInternals)}`,
);

const areaBarrelPublicCross = checkAppCrossAreaImports(
  '/repo/src/app/character/index.ts',
  "export { useProjects } from '../project';",
);
assert(
  areaBarrelPublicCross.length === 0,
  `area barrel may re-export other areas via public barrel, got ${JSON.stringify(areaBarrelPublicCross)}`,
);

const fixtureRoot = mkdtempSync(join(tmpdir(), 'arch-allowlist-'));
mkdirSync(join(fixtureRoot, 'src/features'), { recursive: true });
writeFileSync(join(fixtureRoot, 'src/features/dump.ts'), 'export const x = 1;\n');
mkdirSync(join(fixtureRoot, 'src/domains'), { recursive: true });
writeFileSync(join(fixtureRoot, 'src/domains/ok.ts'), 'export const y = 1;\n');
writeFileSync(join(fixtureRoot, 'src/NewCharacterService.ts'), 'export const z = 1;\n');
writeFileSync(join(fixtureRoot, 'src/App.tsx'), 'export {};\n');
const allowlistHits = checkAllowedSrcCodeRoots(fixtureRoot);
assert(
  allowlistHits.some((v) => v.file === 'src/features' && v.rule.includes('allowlist')),
  `unknown src root must fail, got ${JSON.stringify(allowlistHits)}`,
);
assert(
  allowlistHits.some((v) => v.file === 'src/NewCharacterService.ts'),
  `unknown top-level src file must fail, got ${JSON.stringify(allowlistHits)}`,
);
assert(
  !allowlistHits.some((v) => v.file === 'src/App.tsx' || v.file === 'src/domains'),
  'allowed roots/files must not be flagged',
);

const live = runArchitectureBoundaryCheck();
assert(live.violations.length === 0, `live repo should pass, got ${JSON.stringify(live.violations)}`);
assert(
  typeof live.counts.legacyBaseline === 'number' && live.counts.legacyBaseline > 0,
  'live check must load legacy freeze baseline',
);
assert(
  live.counts.legacyCurrent <= live.counts.legacyBaseline,
  'live legacy path count must not exceed baseline',
);

console.log('Architecture boundary self-test passed.');
