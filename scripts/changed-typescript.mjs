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

function isSrcTs(path) {
  return path.startsWith('src/') && extensions.has(extname(path));
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean).filter(isSrcTs))];
}

/**
 * Changed TypeScript under src/: committed range vs base **plus** unstaged/untracked worktree.
 * Avoids skipping gates when working directly on main with only local edits.
 */
export function collectChangedTypeScriptFiles() {
  const paths = [];

  const baseRef = resolveBaseRef();
  if (baseRef) {
    try {
      const mergeBase = git(['merge-base', 'HEAD', baseRef]);
      const committed = git([
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
      if (committed) paths.push(...committed.split('\n'));
    } catch {
      // ignore merge-base failures; still collect worktree
    }
  }

  try {
    const unstaged = git([
      'diff',
      '--name-only',
      '--diff-filter=ACMR',
      'HEAD',
      '--',
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/*.ts',
      'src/*.tsx',
    ]);
    if (unstaged) paths.push(...unstaged.split('\n'));
  } catch {
    // ignore
  }

  try {
    const untracked = git([
      'ls-files',
      '--others',
      '--exclude-standard',
      '--',
      'src/**/*.ts',
      'src/**/*.tsx',
    ]);
    if (untracked) paths.push(...untracked.split('\n'));
  } catch {
    // ignore
  }

  return uniquePaths(paths);
}
