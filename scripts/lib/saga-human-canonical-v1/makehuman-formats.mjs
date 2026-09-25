/**
 * saga-human-canonical-v1/makehuman-formats — parsers for MakeHuman CC0 data files.
 * Location: scripts/lib/saga-human-canonical-v1/makehuman-formats.mjs
 *
 * Pure functions over file text (formats read from the data files themselves; no MakeHuman code):
 * - OBJ: positions, UVs, faces with UV indices and group names
 * - .target: sparse "vertexIndex dx dy dz" deltas (decimeters, additive)
 * - .mhclo: proxy fitting — per proxy vertex either 1 base index (exact copy) or
 *   3 base indices + 3 weights + 3 offsets (offset scaled per axis by x/y/z_scale refs)
 * - .mhskel: JSON skeleton; joints are vertex groups, bones reference head/tail joints
 * - .mhw: JSON skin weights { weights: { bone: [[vertexIndex, weight], ...] } }
 */

function resolveObjIndex(token, count, lineNo) {
  const n = Number.parseInt(token, 10);
  if (!Number.isFinite(n) || n === 0) throw new Error(`OBJ line ${lineNo}: bad index "${token}"`);
  const idx = n > 0 ? n - 1 : count + n;
  if (idx < 0 || idx >= count) throw new Error(`OBJ line ${lineNo}: index ${n} out of range (${count})`);
  return idx;
}

function finiteOrThrow(values, what, lineNo) {
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error(`${what} line ${lineNo}: non-finite number`);
  }
  return values;
}

/**
 * @param {string} text
 * @returns {{ positions: Float64Array; uvs: Float64Array; faces: { v: number[]; vt: number[] | null; group: string }[] }}
 */
export function parseObj(text) {
  const positions = [];
  const uvs = [];
  const faces = [];
  let group = 'default';
  const lines = text.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln += 1) {
    const line = lines[ln].trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\s+/);
    const tag = parts[0];
    if (tag === 'v') {
      positions.push(...finiteOrThrow([+parts[1], +parts[2], +parts[3]], 'OBJ', ln + 1));
    } else if (tag === 'vt') {
      uvs.push(...finiteOrThrow([+parts[1], +parts[2]], 'OBJ', ln + 1));
    } else if (tag === 'g' || tag === 'o') {
      group = parts.slice(1).join(' ') || 'default';
    } else if (tag === 'f') {
      const v = [];
      const vt = [];
      for (let i = 1; i < parts.length; i += 1) {
        const [a, b] = parts[i].split('/');
        v.push(resolveObjIndex(a, positions.length / 3, ln + 1));
        vt.push(b ? resolveObjIndex(b, uvs.length / 2, ln + 1) : -1);
      }
      if (v.length < 3) throw new Error(`OBJ line ${ln + 1}: face with fewer than 3 vertices`);
      faces.push({ v, vt: vt.every((t) => t >= 0) ? vt : null, group });
    }
  }
  return { positions: Float64Array.from(positions), uvs: Float64Array.from(uvs), faces };
}

/**
 * @param {string} text
 * @returns {{ indices: Int32Array; deltas: Float64Array }}
 */
export function parseTarget(text) {
  const indices = [];
  const deltas = [];
  const seen = new Set();
  const lines = text.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln += 1) {
    const line = lines[ln].trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\s+/);
    if (parts.length < 4) throw new Error(`target line ${ln + 1}: expected "index dx dy dz"`);
    const idx = Number.parseInt(parts[0], 10);
    if (!Number.isInteger(idx) || idx < 0) throw new Error(`target line ${ln + 1}: bad vertex index`);
    if (seen.has(idx)) throw new Error(`target line ${ln + 1}: duplicate vertex index ${idx}`);
    seen.add(idx);
    indices.push(idx);
    deltas.push(...finiteOrThrow([+parts[1], +parts[2], +parts[3]], 'target', ln + 1));
  }
  return { indices: Int32Array.from(indices), deltas: Float64Array.from(deltas) };
}

function parseScaleRef(parts, lineNo) {
  const a = Number.parseInt(parts[1], 10);
  const b = Number.parseInt(parts[2], 10);
  const den = Number(parts[3]);
  if (!Number.isInteger(a) || !Number.isInteger(b) || !(den > 0)) {
    throw new Error(`mhclo line ${lineNo}: bad ${parts[0]}`);
  }
  return { a, b, den };
}

/**
 * @param {string} text
 * @returns {{ name: string | null; uuid: string | null; basemesh: string | null; objFile: string | null; material: string | null; scale: { x: { a: number; b: number; den: number } | null; y: { a: number; b: number; den: number } | null; z: { a: number; b: number; den: number } | null }; refs: { idx: [number, number, number]; w: [number, number, number]; offset: [number, number, number] }[] }}
 */
export function parseMhclo(text) {
  const out = {
    name: null,
    uuid: null,
    basemesh: null,
    objFile: null,
    material: null,
    scale: { x: null, y: null, z: null },
    refs: [],
  };
  let inVerts = false;
  const lines = text.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln += 1) {
    const line = lines[ln].trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\s+/);
    if (inVerts) {
      if (parts.length === 1 && /^\d+$/.test(parts[0])) {
        const i = Number(parts[0]);
        out.refs.push({ idx: [i, i, i], w: [1, 0, 0], offset: [0, 0, 0] });
        continue;
      }
      if (parts.length === 9 && /^\d+$/.test(parts[0])) {
        const n = parts.map(Number);
        finiteOrThrow(n, 'mhclo', ln + 1);
        out.refs.push({ idx: [n[0], n[1], n[2]], w: [n[3], n[4], n[5]], offset: [n[6], n[7], n[8]] });
        continue;
      }
      inVerts = false;
    }
    const key = parts[0];
    if (key === 'verts') {
      if (parts[1] !== '0') throw new Error(`mhclo line ${ln + 1}: only "verts 0" (single base mesh) supported`);
      inVerts = true;
    } else if (key === 'x_scale' || key === 'y_scale' || key === 'z_scale') {
      out.scale[key[0]] = parseScaleRef(parts, ln + 1);
    } else if (key === 'delete_verts') {
      throw new Error('mhclo delete_verts is not supported by saga-human-canonical-v1');
    } else if (key === 'name') out.name = parts.slice(1).join(' ');
    else if (key === 'uuid') out.uuid = parts[1] ?? null;
    else if (key === 'basemesh') out.basemesh = parts[1] ?? null;
    else if (key === 'obj_file') out.objFile = parts[1] ?? null;
    else if (key === 'material') out.material = parts[1] ?? null;
  }
  if (!out.refs.length) throw new Error('mhclo has no verts section');
  return out;
}

/**
 * @param {string} text
 * @returns {{ name: string; bones: Record<string, { head: string; tail: string; parent: string | null }>; joints: Record<string, number[]> }}
 */
export function parseMhskel(text) {
  const json = JSON.parse(text);
  if (!json || typeof json.bones !== 'object' || typeof json.joints !== 'object') {
    throw new Error('mhskel: missing bones/joints');
  }
  for (const [name, bone] of Object.entries(json.bones)) {
    if (typeof bone.head !== 'string' || typeof bone.tail !== 'string') {
      throw new Error(`mhskel: bone ${name} lacks head/tail joint`);
    }
    if (!Array.isArray(json.joints[bone.head]) || !Array.isArray(json.joints[bone.tail])) {
      throw new Error(`mhskel: bone ${name} references an unknown joint`);
    }
    if (bone.parent != null && !json.bones[bone.parent]) {
      throw new Error(`mhskel: bone ${name} has unknown parent ${bone.parent}`);
    }
  }
  return { name: String(json.name ?? ''), bones: json.bones, joints: json.joints };
}

/**
 * @param {string} text
 * @returns {Record<string, [number, number][]>}
 */
export function parseMhw(text) {
  const json = JSON.parse(text);
  if (!json || typeof json.weights !== 'object') throw new Error('mhw: missing weights');
  for (const [bone, list] of Object.entries(json.weights)) {
    if (!Array.isArray(list)) throw new Error(`mhw: weights for ${bone} is not a list`);
    for (const pair of list) {
      if (!Array.isArray(pair) || !Number.isInteger(pair[0]) || !Number.isFinite(pair[1])) {
        throw new Error(`mhw: bad weight entry for ${bone}`);
      }
    }
  }
  return json.weights;
}
