#!/usr/bin/env node
/**
 * fetch-liveact-reference-vrm — pinned Golden Reference VRM: immutable original + reproducible derivative.
 * Location: scripts/fetch-liveact-reference-vrm.mjs
 *
 * The upstream original (~68MB, Git LFS) is cached unmodified under .cache/ and verified against the
 * sha256 of the upstream LFS pointer. The served file in public/ is the derivative `saga-teeth-binds-v1`,
 * rebuilt from the original by scripts/lib/liveact-reference-vrm-teeth-binds.mjs and verified against its
 * pinned sha256. Binaries are gitignored; ATTRIBUTION.md (generated here) is committed.
 *
 * Usage: node scripts/fetch-liveact-reference-vrm.mjs [--skip-if-present]
 *   --skip-if-present  keep a served file that already matches the pinned derivative (no download)
 */
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import process from 'node:process';
import { patchReferenceVrmTeethBinds } from './lib/liveact-reference-vrm-teeth-binds.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const COMMIT = '3a79e95bc81655a3e1ec020538c67e7e17551b6f';
const ASSET_PATH = 'White/White_M_1_Default.vrm';
/** Upstream Git LFS pointer `oid sha256:` at COMMIT — identity of the unmodified original. */
const ORIGINAL_SHA256 = '1ab7130c773bce62053c18599aea786ae6565604aeab4fcc9ef75c940830cff9';
const ORIGINAL_BYTES = 68580812;
/** Changing the patch output requires a new DERIVATIVE_ID and hash (and the domain provenance). */
const DERIVATIVE_ID = 'saga-teeth-binds-v1';
const DERIVATIVE_SHA256 = '323269ae9de3b13294135e6e2c3d84b52eb2c5d29d5a2ac9e1619f273be1645b';
const DOWNLOAD_URL = `https://media.githubusercontent.com/media/TLTMedia/valid-vrm-avatars/${COMMIT}/${ASSET_PATH}`;
const ORIGINAL = join(root, '.cache/liveact-reference-vrm/White_M_1_Default.vrm');
const OUT = join(root, 'public/assets/avatars/reference/valid-white-m1-default.vrm');
const ATTR = join(root, 'public/assets/avatars/reference/ATTRIBUTION.md');

const attribution = `# Attribution — LiveAct Golden Reference VRM

- **File:** \`valid-white-m1-default.vrm\` — SagaDrive derivative \`${DERIVATIVE_ID}\` of \`${ASSET_PATH}\`
- **Upstream:** https://github.com/TLTMedia/valid-vrm-avatars
- **Commit:** \`${COMMIT}\`
- **Original sha256:** \`${ORIGINAL_SHA256}\` (${ORIGINAL_BYTES} bytes; upstream Git LFS pointer oid)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Original:** Google VALID — https://github.com/google-research/google-research/tree/master/valid
- **VRM + ARKit52:** TLTMedia
- **Purpose:** SagaDrive LiveAct diagnostic reference only — not a product default avatar
- **Changes (SagaDrive):** the expressions \`jawOpen\`, \`jawLeft\`, \`jawRight\` and \`jawForward\` additionally bind the lower-teeth mesh (\`h_TeethDown\`) to its authored \`h_teeth.t_*\` twin shape, so the teeth follow the jaw. Applied by \`scripts/lib/liveact-reference-vrm-teeth-binds.mjs\`; geometry, textures and rig are unchanged.
- **Derivative sha256:** \`${DERIVATIVE_SHA256}\` (\`${DERIVATIVE_ID}\`, rebuilt deterministically from the original)

Fetch binary: \`node scripts/fetch-liveact-reference-vrm.mjs\` — the unmodified original is kept in \`.cache/liveact-reference-vrm/\` (gitignored); \`--skip-if-present\` keeps a served file that already matches the derivative hash.
`;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function fileSha256(path) {
  return existsSync(path) ? sha256(readFileSync(path)) : null;
}

function fail(message) {
  console.error(`fetch-liveact-reference-vrm FAIL: ${message}`);
  process.exit(1);
}

async function ensureOriginal() {
  if (fileSha256(ORIGINAL) === ORIGINAL_SHA256) return 'cached';
  mkdirSync(dirname(ORIGINAL), { recursive: true });
  // Checkouts from before the derivative split may still hold the unpatched upstream bytes in public/.
  if (fileSha256(OUT) === ORIGINAL_SHA256) {
    copyFileSync(OUT, ORIGINAL);
    return 'recovered from public/';
  }
  console.log('fetch-liveact-reference-vrm: downloading original…', DOWNLOAD_URL);
  const res = await fetch(DOWNLOAD_URL);
  if (!res.ok || !res.body) fail(`HTTP ${res.status} for ${DOWNLOAD_URL}`);
  const partial = `${ORIGINAL}.part`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(partial));
  const bytes = readFileSync(partial);
  if (bytes.length !== ORIGINAL_BYTES || sha256(bytes) !== ORIGINAL_SHA256) {
    rmSync(partial, { force: true });
    fail(`original mismatch: ${bytes.length} bytes, sha256 ${sha256(bytes)} (expected ${ORIGINAL_SHA256})`);
  }
  renameSync(partial, ORIGINAL);
  return 'downloaded';
}

function buildDerivative() {
  const { buffer, added } = patchReferenceVrmTeethBinds(readFileSync(ORIGINAL));
  const hash = sha256(buffer);
  if (hash !== DERIVATIVE_SHA256) {
    fail(`derivative sha256 ${hash} !== pinned ${DERIVATIVE_SHA256} — patch output changed; bump DERIVATIVE_ID + hash`);
  }
  writeFileSync(OUT, buffer);
  return added;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(ATTR, attribution, 'utf8');

if (process.argv.includes('--skip-if-present') && fileSha256(OUT) === DERIVATIVE_SHA256) {
  console.log(`fetch-liveact-reference-vrm: ${DERIVATIVE_ID} already present`, relative(root, OUT));
  process.exit(0);
}

const originalState = await ensureOriginal();
const added = buildDerivative();
console.log(
  `fetch-liveact-reference-vrm OK — original ${originalState} (${relative(root, ORIGINAL)}), ` +
    `derivative ${DERIVATIVE_ID} written (${added.join('; ')})`,
);
