#!/usr/bin/env node
/**
 * liveact-face-mapping-gt-mark-copy-check — GT mark vs clipboard separation (#421 P3).
 * Location: scripts/liveact-face-mapping-gt-mark-copy-check.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const runsDir = join(root, '.qa/runs');
mkdirSync(runsDir, { recursive: true });

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-mapping-gt-mark-copy-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const panel = readFileSync(join(root, 'src/app/character/liveact/FaceMappingAuthoringPanel.tsx'), 'utf8');
const helperSrc = readFileSync(
  join(root, 'src/app/character/liveact/face-mapping-gt-mark-copy.ts'),
  'utf8',
);
check(/runFaceMappingGtMarkAndCopy/.test(panel), 'panel uses mark/copy helper');
check(/faceMappingGtMarkCopyLabelDe/.test(panel), 'panel uses separated labels');
check(!/GT fehlgeschlagen/.test(panel), 'no conflated GT fehlgeschlagen copy');
check(
  /GT markiert & kopiert/.test(helperSrc) &&
    /GT markiert · Kopieren fehlgeschlagen/.test(helperSrc) &&
    /Ground Truth konnte nicht markiert werden/.test(helperSrc),
  'labels present',
);

const outfile = join(runsDir, 'liveact-face-mapping-gt-mark-copy-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/app/character/liveact/face-mapping-gt-mark-copy.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  logLevel: 'silent',
});
const { runFaceMappingGtMarkAndCopy, faceMappingGtMarkCopyLabelDe } = await import(
  `${outfile}?t=${Date.now()}`
);

{
  const result = await runFaceMappingGtMarkAndCopy({
    mark: () => null,
    writeText: async () => {
      throw new Error('should not run');
    },
  });
  check(result === 'mark_failed', 'GT operation fails → mark_failed');
  check(
    faceMappingGtMarkCopyLabelDe(result) === 'Ground Truth konnte nicht markiert werden',
    'mark_failed label',
  );
}

{
  let marked = false;
  const result = await runFaceMappingGtMarkAndCopy({
    mark: () => {
      marked = true;
      return '{"kind":"gt"}';
    },
    writeText: async () => undefined,
  });
  check(marked && result === 'copied', 'GT succeeds + clipboard succeeds → copied');
  check(faceMappingGtMarkCopyLabelDe(result) === 'GT markiert & kopiert', 'copied label');
}

{
  let marked = false;
  let clipboardTried = false;
  const result = await runFaceMappingGtMarkAndCopy({
    mark: () => {
      marked = true;
      return '{"kind":"gt"}';
    },
    writeText: async () => {
      clipboardTried = true;
      throw new Error('Clipboard denied');
    },
  });
  check(marked && clipboardTried && result === 'copy_failed', 'GT succeeds + clipboard rejects → copy_failed');
  check(
    faceMappingGtMarkCopyLabelDe(result) === 'GT markiert · Kopieren fehlgeschlagen',
    'copy_failed label',
  );
}

{
  const result = await runFaceMappingGtMarkAndCopy({
    mark: () => {
      throw new Error('freeze failed');
    },
    writeText: async () => undefined,
  });
  check(result === 'mark_failed', 'mark throw → mark_failed');
}

writeFileSync(
  join(runsDir, 'liveact-face-mapping-gt-mark-copy-check.md'),
  `# Face Mapping GT Mark vs Clipboard\n\nPASS ${new Date().toISOString()}\n`,
);

console.log('liveact-face-mapping-gt-mark-copy-check PASS');
