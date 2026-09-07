#!/usr/bin/env node
/**
 * architecture-boundary-check — Enforces Modular Monolith layer import rules (#94)
 * plus Legacy Freeze baseline (#165): no new paths under modules/** or feature components/**.
 * Location: scripts/architecture-boundary-check.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const srcRoot = join(root, 'src');
const DEFAULT_LEGACY_BASELINE = join(root, '.qa/architecture/legacy-freeze-baseline.json');

/** Source extensions counted as legacy freeze paths (not vendor/build). */
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;

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

/**
 * Rel paths under src/modules/** and src/components/** (fully eradicated after #175).
 * Any file under these roots is a hard failure — baseline deletions are historical only.
 */
export function collectLegacyFreezePaths(rootDir = root) {
  const paths = [];
  const modulesDir = join(rootDir, 'src', 'modules');
  const componentsDir = join(rootDir, 'src', 'components');

  if (existsSync(modulesDir)) {
    for (const file of walkFiles(modulesDir)) {
      if (!SOURCE_EXT.test(file)) continue;
      paths.push(relative(rootDir, file).replace(/\\/g, '/'));
    }
  }

  if (existsSync(componentsDir)) {
    for (const file of walkFiles(componentsDir)) {
      if (!SOURCE_EXT.test(file)) continue;
      paths.push(relative(rootDir, file).replace(/\\/g, '/'));
    }
  }

  return [...new Set(paths)].sort();
}

/** Hard fail if eradicated roots exist (even empty or with non-source files). */
export function checkEradicatedLegacyRoots(rootDir = root) {
  const violations = [];
  for (const rel of ['src/modules', 'src/components']) {
    const abs = join(rootDir, rel);
    if (existsSync(abs)) {
      violations.push({
        file: rel,
        rule: 'eradicated legacy root must not exist (#175)',
        scope: 'legacy-eradicate',
      });
    }
  }
  return violations;
}

export function loadLegacyFreezeBaseline(baselinePath = DEFAULT_LEGACY_BASELINE) {
  if (!existsSync(baselinePath)) {
    return { version: 0, paths: [], missing: true, path: baselinePath };
  }
  const raw = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const paths = Array.isArray(raw.paths) ? raw.paths.map((p) => String(p).replace(/\\/g, '/')) : [];
  return { version: raw.version ?? 1, paths: [...new Set(paths)].sort(), missing: false, path: baselinePath };
}

/**
 * New legacy paths vs baseline → violations. Deletions (baseline − current) are allowed.
 */
export function checkLegacyFreeze(currentPaths, baselinePaths) {
  const allowed = new Set(baselinePaths);
  const violations = [];
  for (const file of currentPaths) {
    if (!allowed.has(file)) {
      violations.push({
        file,
        rule: 'new legacy path (not in freeze baseline)',
        scope: 'legacy-freeze',
      });
    }
  }
  return violations;
}

export function runArchitectureBoundaryCheck(options = {}) {
  const rootDir = options.root ?? root;
  const src = options.srcRoot ?? join(rootDir, 'src');
  const baselinePath = options.legacyBaselinePath ?? join(rootDir, '.qa/architecture/legacy-freeze-baseline.json');
  const skipLegacyFreeze = options.skipLegacyFreeze === true;

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

  let legacyCurrent = [];
  let legacyBaseline = [];
  let legacyRemoved = 0;

  if (!skipLegacyFreeze) {
    violations.push(...checkEradicatedLegacyRoots(rootDir));
    const baseline = loadLegacyFreezeBaseline(baselinePath);
    if (baseline.missing) {
      violations.push({
        file: relative(rootDir, baselinePath).replace(/\\/g, '/') || baselinePath,
        rule: 'missing legacy freeze baseline',
        scope: 'legacy-freeze',
      });
    } else {
      legacyCurrent = collectLegacyFreezePaths(rootDir);
      legacyBaseline = baseline.paths;
      violations.push(...checkLegacyFreeze(legacyCurrent, legacyBaseline));
      const currentSet = new Set(legacyCurrent);
      legacyRemoved = legacyBaseline.filter((p) => !currentSet.has(p)).length;
    }
  }

  return {
    violations,
    counts: {
      domain: domainFiles.length,
      infrastructure: infrastructureFiles.length,
      app: appFiles.length,
      sharedUi: sharedUiFiles.length,
      legacyCurrent: legacyCurrent.length,
      legacyBaseline: legacyBaseline.length,
      legacyRemoved,
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
    `Architecture boundary check passed (${counts.domain} domain, ${counts.infrastructure} infrastructure, ${counts.app} app, ${counts.sharedUi} shared/ui; legacy eradicated ${counts.legacyRemoved}/${counts.legacyBaseline} baseline paths removed, current=${counts.legacyCurrent}).`,
  );
}
