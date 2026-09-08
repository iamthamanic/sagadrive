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

const publicCrossArea = checkAppCrossAreaImports(
  '/repo/src/app/character/edit/CharacterBackgroundComposer.tsx',
  "import { useProjects } from '../../project';",
);
assert(
  publicCrossArea.length === 0,
  `public area barrel must pass, got ${JSON.stringify(publicCrossArea)}`,
);

const areaBarrelExempt = checkAppCrossAreaImports(
  '/repo/src/app/character/index.ts',
  "import { useProjects } from '../project/hooks/useProjects';",
);
assert(
  areaBarrelExempt.length === 0,
  `area public barrel may re-export internals, got ${JSON.stringify(areaBarrelExempt)}`,
);

const fixtureRoot = mkdtempSync(join(tmpdir(), 'arch-allowlist-'));
mkdirSync(join(fixtureRoot, 'src/features'), { recursive: true });
writeFileSync(join(fixtureRoot, 'src/features/dump.ts'), 'export const x = 1;\n');
mkdirSync(join(fixtureRoot, 'src/domains'), { recursive: true });
writeFileSync(join(fixtureRoot, 'src/domains/ok.ts'), 'export const y = 1;\n');
const allowlistHits = checkAllowedSrcCodeRoots(fixtureRoot);
assert(
  allowlistHits.some((v) => v.file === 'src/features' && v.rule.includes('allowlist')),
  `unknown src root must fail, got ${JSON.stringify(allowlistHits)}`,
);
assert(
  !allowlistHits.some((v) => v.file === 'src/domains'),
  'allowed roots must not be flagged',
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
