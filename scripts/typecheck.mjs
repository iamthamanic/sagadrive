import { execFileSync } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import process from 'node:process';
import { collectChangedTypeScriptFiles } from './changed-typescript.mjs';

const root = process.cwd();
const files = collectChangedTypeScriptFiles();

if (files.length === 0) {
  console.log('Typecheck skipped (no changed TypeScript files).');
  process.exit(0);
}

const configPath = join(root, '.qa', '.tsconfig.verify.json');
const config = {
  extends: '../tsconfig.json',
  compilerOptions: {
    noEmit: true,
    allowImportingTsExtensions: true,
  },
  files: files.map((path) => `../${path}`),
  include: [],
};

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

try {
  execFileSync(
    'npm',
    [
      'exec',
      '--yes',
      '--package=typescript@5.8.3',
      '--',
      'tsc',
      '-p',
      relative(root, configPath),
      '--noEmit',
    ],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );
  console.log(`Typecheck passed (${files.length} changed TypeScript files).`);
} finally {
  await rm(configPath, { force: true });
}
