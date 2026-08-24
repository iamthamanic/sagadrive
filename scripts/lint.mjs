import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceRoot = join(root, 'src');
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

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(path);
      return extensions.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

const files = await collectFiles(sourceRoot);
const failures = [];

for (const file of files) {
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
  console.error('Type-safety lint failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Type-safety lint passed (${files.length} TypeScript files).`);
