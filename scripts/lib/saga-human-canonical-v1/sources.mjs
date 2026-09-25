/**
 * saga-human-canonical-v1/sources — pinned CC0 MakeHuman inputs: manifest, cache paths, fetch + verify.
 * Location: scripts/lib/saga-human-canonical-v1/sources.mjs
 *
 * Manifest: assets/species-3d/human-canonical-v1/sources.json (sha256 + bytes per file).
 * Cache: .cache/saga-human-canonical-v1/sources/<origin>/<path> — written once, never modified.
 * Network is only touched for files that are missing or fail verification.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { openRemoteZip, readRemoteZipMember } from '../remote-zip-range.mjs';

export const SOURCES_MANIFEST_REL = 'assets/species-3d/human-canonical-v1/sources.json';
export const SOURCES_CACHE_REL = '.cache/saga-human-canonical-v1/sources';
export const SOURCES_CONTRACT_VERSION = 'SagaHumanCanonicalSourcesV1';

const DOWNLOAD_CONCURRENCY = 8;

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** @param {string} root */
export function loadSourcesManifest(root) {
  const manifest = JSON.parse(readFileSync(join(root, SOURCES_MANIFEST_REL), 'utf8'));
  if (manifest.contractVersion !== SOURCES_CONTRACT_VERSION) {
    throw new Error(`Unsupported sources manifest: ${manifest.contractVersion}`);
  }
  const ids = new Set();
  for (const f of manifest.files) {
    if (ids.has(f.id)) throw new Error(`duplicate source id ${f.id}`);
    ids.add(f.id);
    if (!manifest.origins[f.origin]) throw new Error(`unknown origin ${f.origin} for ${f.id}`);
    if (!/^[0-9a-f]{64}$/.test(f.sha256)) throw new Error(`bad sha256 for ${f.id}`);
    if (f.path.includes('..')) throw new Error(`path escapes cache for ${f.id}`);
  }
  return manifest;
}

/** @param {string} root @param {{ origin: string; path: string }} file */
export function sourceCachePath(root, file) {
  return join(root, SOURCES_CACHE_REL, file.origin, file.path);
}

function verified(path, file) {
  if (!existsSync(path)) return false;
  const buf = readFileSync(path);
  return buf.length === file.bytes && sha256(buf) === file.sha256;
}

function writeVerified(path, file, buf) {
  if (buf.length !== file.bytes) {
    throw new Error(`${file.id}: ${buf.length} bytes, expected ${file.bytes} (upstream drift?)`);
  }
  const got = sha256(buf);
  if (got !== file.sha256) throw new Error(`${file.id}: sha256 ${got} != pinned ${file.sha256} (upstream drift?)`);
  mkdirSync(dirname(path), { recursive: true });
  const part = `${path}.part`;
  writeFileSync(part, buf);
  renameSync(part, path);
}

async function downloadRaw(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function runPool(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Ensure every pinned input is cached and verified.
 * @param {{ root: string; verifyOnly?: boolean; log?: (msg: string) => void }} opts
 * @returns {Promise<{ manifest: ReturnType<typeof loadSourcesManifest>; paths: Map<string, string>; fetched: number }>}
 */
export async function ensureSagaHumanCanonicalV1Sources(opts) {
  const { root, verifyOnly = false, log = () => {} } = opts;
  const manifest = loadSourcesManifest(root);
  const paths = new Map();
  const missing = [];
  for (const file of manifest.files) {
    const path = sourceCachePath(root, file);
    paths.set(file.id, path);
    if (!verified(path, file)) missing.push(file);
  }
  if (missing.length === 0) return { manifest, paths, fetched: 0 };
  if (verifyOnly) {
    throw new Error(
      `${missing.length} source file(s) missing or unverified (e.g. ${missing[0].id}) — run: node scripts/fetch-saga-human-canonical-v1-sources.mjs`,
    );
  }

  const rawFiles = missing.filter((f) => manifest.origins[f.origin].rawBaseUrl);
  const zipFiles = missing.filter((f) => manifest.origins[f.origin].zipUrl);
  const unknown = missing.filter((f) => !rawFiles.includes(f) && !zipFiles.includes(f));
  if (unknown.length) throw new Error(`no download method for ${unknown.map((f) => f.id).join(', ')}`);

  await runPool(rawFiles, DOWNLOAD_CONCURRENCY, async (file) => {
    const url = manifest.origins[file.origin].rawBaseUrl + file.path;
    writeVerified(sourceCachePath(root, file), file, await downloadRaw(url));
    log(`fetched ${file.id} (${file.bytes} B)`);
  });

  const byZip = new Map();
  for (const file of zipFiles) {
    const url = manifest.origins[file.origin].zipUrl;
    if (!byZip.has(url)) byZip.set(url, []);
    byZip.get(url).push(file);
  }
  for (const [url, files] of byZip) {
    const zip = await openRemoteZip(url);
    log(`zip ${url}: ${zip.members.size} members, ${zip.size} B, last-modified ${zip.lastModified ?? 'n/a'}`);
    await runPool(files, 4, async (file) => {
      const member = zip.members.get(file.path);
      if (!member) throw new Error(`${file.id}: member ${file.path} missing from pack (upstream drift?)`);
      if (file.crc32 && member.crc32.toString(16).padStart(8, '0') !== file.crc32) {
        throw new Error(`${file.id}: pack CRC32 changed (upstream drift?)`);
      }
      writeVerified(sourceCachePath(root, file), file, await readRemoteZipMember(zip, file.path));
      log(`fetched ${file.id} from pack (${file.bytes} B)`);
    });
  }
  return { manifest, paths, fetched: missing.length };
}
