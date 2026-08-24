import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import process from 'node:process';
import { collectChangedTypeScriptFiles } from './changed-typescript.mjs';

const root = process.cwd();
const forbidden = [
  { label: '@ts-ignore', pattern: /@ts-ignore/ },
  { label: '@ts-nocheck', pattern: /@ts-nocheck/ },
  { label: 'eslint-disable', pattern: /eslint-disable/ },
  { label: 'as any', pattern: /\bas\s+any\b/ },
  { label: ': any', pattern: /:\s*any\b/ },
  { label: '<any>', pattern: /<\s*any\s*>/ },
  { label: 'Record<..., any>', pattern: /Record\s*<[^>]*,\s*any\s*>/ },
];

const files = collectChangedTypeScriptFiles();
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
