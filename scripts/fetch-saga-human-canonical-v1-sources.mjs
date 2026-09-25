#!/usr/bin/env node
/**
 * fetch-saga-human-canonical-v1-sources — download + verify the pinned CC0 MakeHuman inputs.
 * Location: scripts/fetch-saga-human-canonical-v1-sources.mjs
 *
 * Usage: node scripts/fetch-saga-human-canonical-v1-sources.mjs [--verify-only]
 * Inputs: assets/species-3d/human-canonical-v1/sources.json → .cache/saga-human-canonical-v1/sources/
 */

import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { ensureSagaHumanCanonicalV1Sources } from './lib/saga-human-canonical-v1/sources.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const verifyOnly = process.argv.includes('--verify-only');

try {
  const { manifest, fetched } = await ensureSagaHumanCanonicalV1Sources({
    root,
    verifyOnly,
    log: (msg) => console.log(`fetch-saga-human-canonical-v1-sources: ${msg}`),
  });
  console.log(
    `fetch-saga-human-canonical-v1-sources OK: ${manifest.files.length} files verified (${fetched} fetched)`,
  );
} catch (error) {
  console.error(`fetch-saga-human-canonical-v1-sources FAIL: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
