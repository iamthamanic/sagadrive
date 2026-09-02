#!/usr/bin/env node
/**
 * architecture-boundary-check — Enforces Modular Monolith layer import rules (#94).
 * Location: scripts/architecture-boundary-check.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const srcRoot = join(root, 'src');

const FORBIDDEN_IN_DOMAINS = [
  { label: 'React', pattern: /from ['"]react(?:\/|$)/ },
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
  { label: 'React', pattern: /from ['"]react(?:\/|$)/ },
  { label: 'App slices', pattern: /from ['"][^'"]*\/app\// },
  { label: 'UI components folder', pattern: /from ['"][^'"]*\/components\/(?!ui)/ },
];

function walkFiles(dir, acc = []) {
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

function checkFiles(files, rules, scopeLabel) {
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

function collectUnder(subpath) {
  const dir = join(srcRoot, subpath);
  try {
    return walkFiles(dir);
  } catch {
    return [];
  }
}

const domainFiles = collectUnder('domains');
const rulesFiles = domainFiles.filter((file) => file.includes('domains/rules/'));
const nonRulesDomainFiles = domainFiles.filter((file) => !file.includes('domains/rules/'));
const infrastructureFiles = collectUnder('infrastructure');

const violations = [
  ...checkFiles(nonRulesDomainFiles, FORBIDDEN_IN_DOMAINS, 'domains'),
  ...checkFiles(rulesFiles, FORBIDDEN_IN_RULES, 'domains/rules'),
  ...checkFiles(infrastructureFiles, FORBIDDEN_IN_INFRASTRUCTURE, 'infrastructure'),
];

if (violations.length > 0) {
  console.error('Architecture boundary check failed:');
  for (const violation of violations) {
    console.error(`- [${violation.scope}] ${violation.file}: forbidden ${violation.rule}`);
  }
  process.exit(1);
}

console.log(`Architecture boundary check passed (${domainFiles.length} domain, ${infrastructureFiles.length} infrastructure files scanned).`);
