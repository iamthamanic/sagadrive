#!/usr/bin/env node
/**
 * fetch-liveact-reference-vrm — download pinned Golden Reference VRM into public/.
 * Location: scripts/fetch-liveact-reference-vrm.mjs
 *
 * Binary is ~68MB (LFS) — not committed. Attribution stays in ATTRIBUTION.md.
 * After download (or with --skip-if-present) the idempotent teeth-bind patch is applied.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import process from 'node:process';
import { patchReferenceVrmTeethBinds } from './lib/liveact-reference-vrm-teeth-binds.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const COMMIT = '3a79e95bc81655a3e1ec020538c67e7e17551b6f';
const ASSET_PATH = 'White/White_M_1_Default.vrm';
const EXPECTED_BYTES = 68580812;
const OUT = join(root, 'public/assets/avatars/reference/valid-white-m1-default.vrm');
const ATTR = join(root, 'public/assets/avatars/reference/ATTRIBUTION.md');
const DOWNLOAD_URL = `https://media.githubusercontent.com/media/TLTMedia/valid-vrm-avatars/${COMMIT}/${ASSET_PATH}`;

const attribution = `# Attribution — LiveAct Golden Reference VRM

- **File:** \`valid-white-m1-default.vrm\` (from \`${ASSET_PATH}\`)
- **Upstream:** https://github.com/TLTMedia/valid-vrm-avatars
- **Commit:** \`${COMMIT}\`
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Original:** Google VALID — https://github.com/google-research/google-research/tree/master/valid
- **VRM + ARKit52:** TLTMedia
- **Purpose:** SagaDrive LiveAct diagnostic reference only — not a product default avatar
- **Changes (SagaDrive):** the expressions \`jawOpen\`, \`jawLeft\`, \`jawRight\` and \`jawForward\` additionally bind the lower-teeth mesh (\`h_TeethDown\`) to its authored \`h_teeth.t_*\` twin shape, so the teeth follow the jaw. Applied by \`scripts/lib/liveact-reference-vrm-teeth-binds.mjs\`; geometry, textures and rig are unchanged.

Fetch binary: \`node scripts/fetch-liveact-reference-vrm.mjs\` (existing copy: add \`--skip-if-present\` to apply the patch only)
`;

function applyTeethBinds() {
  const { buffer, added } = patchReferenceVrmTeethBinds(readFileSync(OUT));
  if (added.length > 0) writeFileSync(OUT, buffer);
  console.log(
    `fetch-liveact-reference-vrm: teeth binds ${
      added.length > 0 ? `added (${added.join(', ')})` : 'already present'
    }`,
  );
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(ATTR, attribution, 'utf8');

if (existsSync(OUT) && process.argv.includes('--skip-if-present')) {
  console.log('fetch-liveact-reference-vrm: already present', OUT);
  applyTeethBinds();
  process.exit(0);
}

console.log('fetch-liveact-reference-vrm: downloading…');
const res = await fetch(DOWNLOAD_URL);
if (!res.ok || !res.body) {
  console.error(`fetch-liveact-reference-vrm FAIL: HTTP ${res.status}`);
  process.exit(1);
}
await pipeline(Readable.fromWeb(res.body), createWriteStream(OUT));
const { size } = await import('node:fs').then((fs) => fs.statSync(OUT));
if (size !== EXPECTED_BYTES) {
  console.error(
    `fetch-liveact-reference-vrm FAIL: size ${size} !== expected ${EXPECTED_BYTES}`,
  );
  process.exit(1);
}
applyTeethBinds();
console.log('fetch-liveact-reference-vrm OK', OUT, size);
