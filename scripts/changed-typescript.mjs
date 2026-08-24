import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const extensions = new Set(['.ts', '.tsx']);

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

export function collectChangedTypeScriptFiles() {
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
