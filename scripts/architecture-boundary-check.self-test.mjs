#!/usr/bin/env node
/**
 * architecture-boundary-check.self-test — Deterministic fixtures for boundary rules.
 * Location: scripts/architecture-boundary-check.self-test.mjs
 */
import process from 'node:process';
import {
  checkCharacterCrossSliceImports,
  checkContentImportPaths,
  extractImportPaths,
  resolveRelativeImport,
  runArchitectureBoundaryCheck,
} from './architecture-boundary-check.mjs';

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

const live = runArchitectureBoundaryCheck();
assert(live.violations.length === 0, `live repo should pass, got ${JSON.stringify(live.violations)}`);

console.log('Architecture boundary self-test passed.');
