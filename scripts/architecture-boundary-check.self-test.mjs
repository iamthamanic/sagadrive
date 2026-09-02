#!/usr/bin/env node
/**
 * architecture-boundary-check.self-test — Deterministic fixtures for boundary rules.
 * Location: scripts/architecture-boundary-check.self-test.mjs
 */
import process from 'node:process';
import {
  checkCharacterCrossSliceImports,
  extractImportPaths,
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
  'private cross-slice import',
  '/repo/src/app/character/edit/CharacterEditor.tsx',
  "import { Foo } from '../creation/CharacterArchetypePanel';",
  'private cross-slice import',
);

assertNoCrossSliceViolation(
  'public slice import',
  '/repo/src/app/character/edit/CharacterEditor.tsx',
  "import { CharacterArchetypePanel } from '../creation';",
);

assert(
  /from ['"]react/.test("import { useState } from 'react';"),
  'domain React pattern should match react imports',
);

assert(
  /from ['"][^'"]*supabase/.test("import { supabase } from '../../lib/supabase';"),
  'domain Supabase pattern should match supabase imports',
);

assert(
  /from ['"][^'"]*\/domains\//.test("export * from '../../domains/rules/sagadrive';"),
  'shared/ui domain pattern should match domain imports',
);

assert(
  extractImportPaths("import { Foo } from '../creation';\nimport('./lazy').then(() => {});").includes('../creation'),
  'extractImportPaths should capture static and dynamic imports',
);

const live = runArchitectureBoundaryCheck();
assert(live.violations.length === 0, `live repo should pass, got ${JSON.stringify(live.violations)}`);

console.log('Architecture boundary self-test passed.');
