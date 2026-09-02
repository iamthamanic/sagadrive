#!/usr/bin/env node
/**
 * architecture-boundary-check — Enforces Modular Monolith layer import rules (#94, hardened).
 * Location: scripts/architecture-boundary-check.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const srcRoot = join(root, 'src');

const FORBIDDEN_IN_DOMAINS = [
  { label: 'React', pattern: /from ['"]react/ },
  { label: 'React DOM', pattern: /from ['"]react-dom/ },
  { label: 'UI components', pattern: /from ['"][^'"]*\/components\// },
  { label: 'App slices', pattern: /from ['"][^'"]*\/app\// },
  { label: 'Supabase client', pattern: /from ['"][^'"]*supabase/ },
  { label: 'Infrastructure internals', pattern: /from ['"][^'"]*\/infrastructure\// },
];

const FORBIDDEN_IN_RULES = [
  ...FORBIDDEN_IN_DOMAINS,
  { label: 'Character module legacy', pattern: /from ['"][^'"]*\/modules\/characters\// },
];

const FORBIDDEN_IN_INFRASTRUCTURE = [
  { label: 'React', pattern: /from ['"]react/ },
  { label: 'App slices', pattern: /from ['"][^'"]*\/app\// },
  { label: 'UI components folder', pattern: /from ['"][^'"]*\/components\/(?!ui)/ },
];

const FORBIDDEN_IN_APP = [
  { label: 'Supabase client', pattern: /from ['"][^'"]*supabase/ },
  { label: 'Supabase lib', pattern: /from ['"][^'"]*\/lib\/supabase['"]/ },
];

const FORBIDDEN_IN_SHARED_UI = [
  { label: 'Domain layer', pattern: /from ['"][^'"]*\/domains\// },
  { label: 'Infrastructure layer', pattern: /from ['"][^'"]*\/infrastructure\// },
  { label: 'App slices', pattern: /from ['"][^'"]*\/app\// },
  { label: 'Legacy rules modules', pattern: /from ['"][^'"]*\/modules\/rulesets\// },
  { label: 'Legacy character modules', pattern: /from ['"][^'"]*\/modules\/characters\// },
];

const CHARACTER_SLICE_PUBLIC = {
  edit: new Set(['creation', 'progression', 'shared']),
  creation: new Set(['shared', 'progression']),
  progression: new Set(['shared']),
};

export function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

export function extractImportPaths(content) {
  const paths = new Set();
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      paths.add(match[1]);
    }
  }

  return [...paths];
}

function isPublicCharacterSliceImport(fromSlice, importPath) {
  const normalized = importPath.replace(/\/index$/, '');
  const match = normalized.match(/^\.\.\/(creation|progression|shared)$/);
  if (!match) return false;
  return CHARACTER_SLICE_PUBLIC[fromSlice]?.has(match[1]) ?? false;
}

function isPrivateCharacterCrossSliceImport(fromSlice, importPath) {
  const match = importPath.match(/^\.\.\/(creation|progression|edit)\/(.+)$/);
  if (!match) return false;
  const targetSlice = match[1];
  const remainder = match[2];
  if (remainder === 'index' || remainder === 'index.ts') return false;
  if (fromSlice === targetSlice) return false;
  if (targetSlice === 'shared') return false;
  return true;
}

export function checkCharacterCrossSliceImports(filePath, content) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const match = normalizedPath.match(/app\/character\/(edit|creation|progression)\/[^/]+$/);
  if (!match) return [];

  const fromSlice = match[1];
  if (normalizedPath.endsWith('/index.ts')) return [];

  const violations = [];
  for (const importPath of extractImportPaths(content)) {
    if (!importPath.startsWith('.')) continue;

    if (isPrivateCharacterCrossSliceImport(fromSlice, importPath)) {
      violations.push({
        file: normalizedPath.includes('/src/') ? normalizedPath.slice(normalizedPath.indexOf('src/')) : normalizedPath,
        rule: `private cross-slice import (${fromSlice} → ${importPath})`,
        scope: 'app/character',
      });
      continue;
    }

    const crossSliceMatch = importPath.match(/^\.\.\/(creation|progression|edit)(?:\/|$)/);
    if (!crossSliceMatch) continue;
    const targetSlice = crossSliceMatch[1];
    if (targetSlice === fromSlice || targetSlice === 'edit') continue;
    if (isPublicCharacterSliceImport(fromSlice, importPath)) continue;

    violations.push({
      file: normalizedPath.includes('/src/') ? normalizedPath.slice(normalizedPath.indexOf('src/')) : normalizedPath,
      rule: `non-public cross-slice import (${fromSlice} → ${importPath})`,
      scope: 'app/character',
    });
  }

  return violations;
}

export function checkFiles(files, rules, scopeLabel) {
  const violations = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const rel = relative(root, file);
    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        violations.push({ file: rel, rule: rule.label, scope: scopeLabel });
      }
    }
  }
  return violations;
}

function collectUnder(subpath, baseSrc = srcRoot) {
  const dir = join(baseSrc, subpath);
  try {
    return walkFiles(dir);
  } catch {
    return [];
  }
}

export function runArchitectureBoundaryCheck(options = {}) {
  const rootDir = options.root ?? root;
  const src = options.srcRoot ?? join(rootDir, 'src');

  const domainFiles = collectUnder('domains', src);
  const rulesFiles = domainFiles.filter((file) => file.includes('domains/rules/'));
  const nonRulesDomainFiles = domainFiles.filter((file) => !file.includes('domains/rules/'));
  const infrastructureFiles = collectUnder('infrastructure', src);
  const appFiles = collectUnder('app', src);
  const sharedUiFiles = collectUnder('shared/ui', src);

  const violations = [
    ...checkFiles(nonRulesDomainFiles, FORBIDDEN_IN_DOMAINS, 'domains'),
    ...checkFiles(rulesFiles, FORBIDDEN_IN_RULES, 'domains/rules'),
    ...checkFiles(infrastructureFiles, FORBIDDEN_IN_INFRASTRUCTURE, 'infrastructure'),
    ...checkFiles(appFiles, FORBIDDEN_IN_APP, 'app'),
    ...checkFiles(sharedUiFiles, FORBIDDEN_IN_SHARED_UI, 'shared/ui'),
    ...appFiles.flatMap((file) => checkCharacterCrossSliceImports(file, readFileSync(file, 'utf8'))),
  ];

  return {
    violations,
    counts: {
      domain: domainFiles.length,
      infrastructure: infrastructureFiles.length,
      app: appFiles.length,
      sharedUi: sharedUiFiles.length,
    },
  };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const { violations, counts } = runArchitectureBoundaryCheck();

  if (violations.length > 0) {
    console.error('Architecture boundary check failed:');
    for (const violation of violations) {
      console.error(`- [${violation.scope}] ${violation.file}: forbidden ${violation.rule}`);
    }
    process.exit(1);
  }

  console.log(
    `Architecture boundary check passed (${counts.domain} domain, ${counts.infrastructure} infrastructure, ${counts.app} app, ${counts.sharedUi} shared/ui files scanned).`,
  );
}
