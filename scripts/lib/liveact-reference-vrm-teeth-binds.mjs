/**
 * liveact-reference-vrm-teeth-binds — offline expression fix for the Golden Reference VRM.
 * Location: scripts/lib/liveact-reference-vrm-teeth-binds.mjs
 *
 * Upstream binds the ARKit jaw expressions to the skin mesh only, so the lower teeth stay shut
 * while the lips open. Each of these expressions is byte-identical to an authored skin shape
 * (h_expressions.<Shape>) whose teeth twin h_teeth.t_<Shape> exists on the lower-teeth mesh;
 * the patch adds that twin as an extra morphTargetBind. Idempotent; edits the GLB JSON chunk
 * only (BIN, geometry, rig untouched). Asset-specific by design — runtime code stays generic.
 */

export const REFERENCE_VRM_TEETH_BINDS = Object.freeze([
  { expression: 'jawOpen', node: 'h_TeethDown', target: 'h_teeth.t_MouthOpen_h' },
  { expression: 'jawLeft', node: 'h_TeethDown', target: 'h_teeth.t_Ljaw_h' },
  { expression: 'jawRight', node: 'h_TeethDown', target: 'h_teeth.t_Rjaw_h' },
  { expression: 'jawForward', node: 'h_TeethDown', target: 'h_teeth.t_JawFront_h' },
]);

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

/** @returns {{ json: any, bin: Buffer | null }} */
export function readGlbChunks(buffer) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error('Not a GLB/VRM binary (magic mismatch)');
  }
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === CHUNK_JSON) json = JSON.parse(data.toString('utf8'));
    else if (type === CHUNK_BIN) bin = data;
    offset += 8 + length;
  }
  if (!json) throw new Error('GLB JSON chunk missing');
  return { json, bin };
}

function chunk(type, data, padByte) {
  const padded = Math.ceil(data.length / 4) * 4;
  const out = Buffer.alloc(8 + padded, padByte);
  out.writeUInt32LE(padded, 0);
  out.writeUInt32LE(type, 4);
  data.copy(out, 8);
  return out;
}

export function writeGlb(json, bin) {
  const jsonChunk = chunk(CHUNK_JSON, Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const binChunk = bin ? chunk(CHUNK_BIN, bin, 0x00) : Buffer.alloc(0);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + jsonChunk.length + binChunk.length, 8);
  return Buffer.concat([header, jsonChunk, binChunk]);
}

function resolveBindTarget(json, spec) {
  const expression = json.extensions?.VRMC_vrm?.expressions?.custom?.[spec.expression];
  if (!expression) {
    throw new Error(`VRMC_vrm custom expression missing: ${spec.expression}`);
  }
  const nodes = json.nodes ?? [];
  const nodeIndex = nodes.findIndex((n) => n?.name === spec.node && typeof n.mesh === 'number');
  if (nodeIndex < 0) throw new Error(`mesh node missing: ${spec.node}`);
  const mesh = json.meshes?.[nodes[nodeIndex].mesh];
  const targetNames = mesh?.extras?.targetNames ?? [];
  const index = targetNames.indexOf(spec.target);
  if (index < 0) throw new Error(`morph target missing: ${spec.node}[${spec.target}]`);
  return { expression, nodeIndex, index };
}

/** True when every teeth bind of {@link REFERENCE_VRM_TEETH_BINDS} is present. */
export function hasReferenceVrmTeethBinds(json) {
  return REFERENCE_VRM_TEETH_BINDS.every((spec) => {
    const { expression, nodeIndex, index } = resolveBindTarget(json, spec);
    return (expression.morphTargetBinds ?? []).some(
      (bind) => bind.node === nodeIndex && bind.index === index,
    );
  });
}

/**
 * @returns {{ buffer: Buffer, added: string[] }} unchanged buffer when nothing was missing.
 */
export function patchReferenceVrmTeethBinds(buffer) {
  const { json, bin } = readGlbChunks(buffer);
  const added = [];
  for (const spec of REFERENCE_VRM_TEETH_BINDS) {
    const { expression, nodeIndex, index } = resolveBindTarget(json, spec);
    const binds = expression.morphTargetBinds ?? [];
    if (binds.some((bind) => bind.node === nodeIndex && bind.index === index)) continue;
    binds.push({ node: nodeIndex, index, weight: 1 });
    expression.morphTargetBinds = binds;
    added.push(`${spec.expression} → ${spec.node}[${spec.target}]`);
  }
  return { buffer: added.length > 0 ? writeGlb(json, bin) : buffer, added };
}
