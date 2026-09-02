#!/usr/bin/env node
/**
 * architecture-boundary-check — Enforces Modular Monolith layer import rules (#94, hardened).
 * Location: scripts/architecture-boundary-check.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const srcRoot = join(root, 'src');

const IMPORT_PATH_RULES = {
  domains: [
    { label: 'React', test: (p) => /^react(?:\/|$)/.test(p) },
    { label: 'React DOM', test: (p) => p.startsWith('react-dom') },
    { label: 'UI components', test: (p) => p.includes('/components/') },
    { label: 'App slices', test: (p) => p.includes('/app/') },
    { label: 'Supabase client', test: (p) => p.includes('supabase') },
    { label: 'Infrastructure internals', test: (p) => p.includes('/infrastructure/') },
  ],
  'domains/rules': [
    { label: 'React', test: (p) => /^react(?:\/|$)/.test(p) },
    { label: 'React DOM', test: (p) => p.startsWith('react-dom') },
    { label: 'UI components', test: (p) => p.includes('/components/') },
    { label: 'App slices', test: (p) => p.includes('/app/') },
    { label: 'Supabase client', test: (p) => p.includes('supabase') },
    { label: 'Infrastructure internals', test: (p) => p.includes('/infrastructure/') },
    { label: 'Character module legacy', test: (p) => p.includes('/modules/characters/') },
  ],
  infrastructure: [
    { label: 'React', test: (p) => /^react(?:\/|$)/.test(p) },
    { label: 'App slices', test: (p) => p.includes('/app/') },
    {
      label: 'UI components folder',
      test: (p) => /\/components\/(?!ui(?:\/|$))/.test(p),
    },
  ],
  app: [
    { label: 'Supabase client', test: (p) => p.includes('supabase') },
    { label: 'Supabase lib', test: (p) => /(?:^|\/)lib\/supabase(?:\.|$)/.test(p) },
  ],
  'shared/ui': [
    { label: 'Domain layer', test: (p) => p.includes('/domains/') },
    { label: 'Infrastructure layer', test: (p) => p.includes('/infrastructure/') },
    { label: 'App slices', test: (p) => p.includes('/app/') },
    { label: 'Legacy rules modules', test: (p) => p.includes('/modules/rulesets/') },
    { label: 'Legacy character modules', test: (p) => p.includes('/modules/characters/') },
  ],
};

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

export function resolveRelativeImport(filePath, importPath) {
  if (!importPath.startsWith('.')) return importPath.replace(/\\/g, '/');

  const absolute = normalize(join(dirname(filePath), importPath)).replace(/\\/g, '/');
  const srcMarker = '/src/';
  const srcIndex = absolute.indexOf(srcMarker);
  if (srcIndex >= 0) return absolute.slice(srcIndex + srcMarker.length);

  const bareSrcIndex = absolute.indexOf('src/');
  if (bareSrcIndex >= 0) return absolute.slice(bareSrcIndex + 'src/'.length);

  return absolute.replace(/^\/+/, '');
}

export function getCharacterSliceFromPath(normalizedPath) {
  const match = normalizedPath.replace(/\\/g, '/').match(/app\/character\/(edit|creation|progression)(?:\/|$)/);
  return match?.[1];
}

function getCharacterSliceFromResolvedImport(resolvedImportPath) {
  const match = resolvedImportPath.match(/^app\/character\/(edit|creation|progression|shared)(?:\/|$)/);
  return match?.[1];
}

function isSlicePublicBarrel(resolvedImportPath, targetSlice) {
  const barrelPattern = new RegExp(`^app/character/${targetSlice}(?:/index(?:\\.ts)?)?$`);
  return barrelPattern.test(resolvedImportPath.replace(/\\/g, '/'));
}

export function checkCharacterCrossSliceImports(filePath, content) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fromSlice = getCharacterSliceFromPath(normalizedPath);
  if (!fromSlice) return [];
  if (/app\/character\/[^/]+\/index\.ts$/.test(normalizedPath)) return [];

  const displayPath = normalizedPath.includes('/src/')
    ? normalizedPath.slice(normalizedPath.indexOf('src/'))
    : normalizedPath.includes('src/')
      ? normalizedPath.slice(normalizedPath.indexOf('src/'))
      : normalizedPath;

  const violations = [];
  for (const importPath of extractImportPaths(content)) {
    if (!importPath.startsWith('.')) continue;

    const resolved = resolveRelativeImport(filePath, importPath);
    const targetSlice = getCharacterSliceFromResolvedImport(resolved);
    if (!targetSlice || targetSlice === 'shared' || targetSlice === fromSlice) continue;

    const publicAllowed = CHARACTER_SLICE_PUBLIC[fromSlice]?.has(targetSlice) ?? false;
    const isPublicBarrel = isSlicePublicBarrel(resolved, targetSlice);

    if (isPublicBarrel && publicAllowed) continue;

    violations.push({
      file: displayPath,
      rule: isPublicBarrel
        ? `non-public cross-slice import (${fromSlice} → ${importPath})`
        : `private cross-slice import (${fromSlice} → ${importPath})`,
      scope: 'app/character',
    });
  }

  return violations;
}

export function checkContentImportPaths(content, rules, scopeLabel, fileLabel = 'inline') {
  const violations = [];
  for (const importPath of extractImportPaths(content)) {
    for (const rule of rules) {
      if (rule.test(importPath)) {
        violations.push({ file: fileLabel, rule: rule.label, scope: scopeLabel });
        break;
      }
    }
  }
  return violations;
}

export function checkFileImportPaths(filePath, rules, scopeLabel, rootDir = root) {
  const content = readFileSync(filePath, 'utf8');
  const rel = relative(rootDir, filePath);
  return checkContentImportPaths(content, rules, scopeLabel, rel);
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
    ...nonRulesDomainFiles.flatMap((file) =>
      checkFileImportPaths(file, IMPORT_PATH_RULES.domains, 'domains', rootDir),
    ),
    ...rulesFiles.flatMap((file) =>
      checkFileImportPaths(file, IMPORT_PATH_RULES['domains/rules'], 'domains/rules', rootDir),
    ),
    ...infrastructureFiles.flatMap((file) =>
      checkFileImportPaths(file, IMPORT_PATH_RULES.infrastructure, 'infrastructure', rootDir),
    ),
    ...appFiles.flatMap((file) => checkFileImportPaths(file, IMPORT_PATH_RULES.app, 'app', rootDir)),
    ...sharedUiFiles.flatMap((file) =>
      checkFileImportPaths(file, IMPORT_PATH_RULES['shared/ui'], 'shared/ui', rootDir),
    ),
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

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

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
