import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const extensions = new Set(['.ts', '.tsx']);
const forbidden = [
  { label: '@ts-ignore', pattern: /@ts-ignore/ },
  { label: '@ts-nocheck', pattern: /@ts-nocheck/ },
  { label: 'eslint-disable', pattern: /eslint-disable/ },
  { label: 'as any', pattern: /\bas\s+any\b/ },
  { label: ': any', pattern: /:\s*any\b/ },
  { label: '<any>', pattern: /<\s*any\s*>/ },
  { label: 'Record<..., any>', pattern: /Record\s*<[^>]*,\s*any\s*>/ },
];

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function hasRef(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}

function resolveBaseRef() {
  if (process.env.TYPED_STRICT_BASE_REF && hasRef(process.env.TYPED_STRICT_BASE_REF)) {
    return process.env.TYPED_STRICT_BASE_REF;
  }

  const currentRef = process.env.GITHUB_REF_NAME ?? '';
  const baseRef = process.env.GITHUB_BASE_REF ?? '';

  if (baseRef && hasRef(`origin/${baseRef}`)) return `origin/${baseRef}`;
  if (currentRef === 'main' && hasRef('HEAD^')) return 'HEAD^';
  if (hasRef('origin/main')) return 'origin/main';
  if (hasRef('main')) return 'main';
  if (hasRef('HEAD^')) return 'HEAD^';

  return undefined;
}

function collectChangedFiles() {
  const baseRef = resolveBaseRef();
  if (!baseRef) return [];

  const mergeBase = git(['merge-base', 'HEAD', baseRef]);
  const output = git([
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    `${mergeBase}...HEAD`,
    '--',
    'src/**/*.ts',
    'src/**/*.tsx',
    'src/*.ts',
    'src/*.tsx',
  ]);

  if (!output) return [];

  return output
    .split('\n')
    .filter((path) => path.startsWith('src/') && extensions.has(extname(path)));
}

const files = collectChangedFiles();
const failures = [];

for (const path of files) {
  const file = join(root, path);
  const text = await readFile(file, 'utf8');
  const lines = text.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of forbidden) {
      if (rule.pattern.test(line)) {
        failures.push(`${relative(root, file)}:${index + 1} ${rule.label}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Type-safety lint failed on changed TypeScript files:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Type-safety lint passed (${files.length} changed TypeScript files).`);
