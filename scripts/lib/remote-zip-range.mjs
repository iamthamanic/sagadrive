/**
 * remote-zip-range — read single members of a remote ZIP via HTTP range requests.
 * Location: scripts/lib/remote-zip-range.mjs
 *
 * Offline tooling only: pulls a few files out of a large asset pack without downloading it.
 * Classic ZIP only (no ZIP64, no encryption); methods 0 (stored) and 8 (deflate).
 * Sizes come from the central directory, so data-descriptor entries work; CRC32 is verified.
 */

import * as zlib from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
/** 22-byte EOCD record + maximum comment length. */
const EOCD_SEARCH_BYTES = 22 + 0xffff;

async function fetchRange(url, start, endInclusive) {
  const res = await fetch(url, { headers: { Range: `bytes=${start}-${endInclusive}` } });
  if (res.status !== 206) {
    throw new Error(`range ${start}-${endInclusive} of ${url} → HTTP ${res.status} (server must honor Range)`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const expected = endInclusive - start + 1;
  if (buf.length !== expected) {
    throw new Error(`range ${start}-${endInclusive} returned ${buf.length} bytes, expected ${expected}`);
  }
  return buf;
}

/**
 * @param {string} url
 * @returns {Promise<{ url: string; size: number; etag: string | null; lastModified: string | null; members: Map<string, { name: string; flags: number; method: number; crc32: number; compressedSize: number; size: number; localHeaderOffset: number }> }>}
 */
export async function openRemoteZip(url) {
  const head = await fetch(url, { method: 'HEAD' });
  if (!head.ok) throw new Error(`HEAD ${url} → HTTP ${head.status}`);
  const size = Number(head.headers.get('content-length'));
  if (!Number.isFinite(size) || size < 22) throw new Error(`invalid content-length for ${url}`);

  const tailStart = Math.max(0, size - EOCD_SEARCH_BYTES);
  const tail = await fetchRange(url, tailStart, size - 1);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (tail.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`ZIP end-of-central-directory not found in ${url}`);
  const entryCount = tail.readUInt16LE(eocd + 10);
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new Error('ZIP64 archives are not supported');
  }
  const cd =
    cdOffset >= tailStart
      ? tail.subarray(cdOffset - tailStart, cdOffset - tailStart + cdSize)
      : await fetchRange(url, cdOffset, cdOffset + cdSize - 1);

  const members = new Map();
  let p = 0;
  for (let n = 0; n < entryCount; n += 1) {
    if (cd.readUInt32LE(p) !== CENTRAL_SIG) throw new Error(`bad central directory entry #${n}`);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
    members.set(name, {
      name,
      flags: cd.readUInt16LE(p + 8),
      method: cd.readUInt16LE(p + 10),
      crc32: cd.readUInt32LE(p + 16),
      compressedSize: cd.readUInt32LE(p + 20),
      size: cd.readUInt32LE(p + 24),
      localHeaderOffset: cd.readUInt32LE(p + 42),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    url,
    size,
    etag: head.headers.get('etag'),
    lastModified: head.headers.get('last-modified'),
    members,
  };
}

/**
 * @param {Awaited<ReturnType<typeof openRemoteZip>>} zip
 * @param {string} name
 * @returns {Promise<Buffer>}
 */
export async function readRemoteZipMember(zip, name) {
  const m = zip.members.get(name);
  if (!m) throw new Error(`ZIP member not found: ${name}`);
  if (m.flags & 0x1) throw new Error(`encrypted ZIP member not supported: ${name}`);
  const local = await fetchRange(zip.url, m.localHeaderOffset, m.localHeaderOffset + 29);
  if (local.readUInt32LE(0) !== LOCAL_SIG) throw new Error(`bad local header for ${name}`);
  const dataStart = m.localHeaderOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
  const raw =
    m.compressedSize > 0
      ? await fetchRange(zip.url, dataStart, dataStart + m.compressedSize - 1)
      : Buffer.alloc(0);

  let data;
  if (m.method === 0) data = raw;
  else if (m.method === 8) data = zlib.inflateRawSync(raw);
  else throw new Error(`unsupported compression method ${m.method} for ${name}`);

  if (data.length !== m.size) throw new Error(`size mismatch for ${name}: ${data.length} != ${m.size}`);
  if (typeof zlib.crc32 === 'function' && zlib.crc32(data) >>> 0 !== m.crc32) {
    throw new Error(`CRC32 mismatch for ${name}`);
  }
  return data;
}
