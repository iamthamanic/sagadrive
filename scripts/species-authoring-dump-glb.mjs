#!/usr/bin/env node
/**
 * Dump glTF material/texture bindings from a GLB for authoring QA.
 * Location: scripts/species-authoring-dump-glb.mjs
 * Usage: node scripts/species-authoring-dump-glb.mjs <path.glb> [out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
const out = process.argv[3];
if (!path) {
  console.error('Usage: node scripts/species-authoring-dump-glb.mjs <path.glb> [out.json]');
  process.exit(1);
}

const buf = readFileSync(path);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));

let triangles = 0;
for (const mesh of gltf.meshes || []) {
  for (const prim of mesh.primitives || []) {
    if (prim.indices != null) {
      triangles += (gltf.accessors[prim.indices].count || 0) / 3;
    }
  }
}

const materials = (gltf.materials || []).map((m, index) => {
  const pbr = m.pbrMetallicRoughness || {};
  return {
    index,
    name: m.name || null,
    baseColorTexture: pbr.baseColorTexture?.index ?? null,
    metallicRoughnessTexture: pbr.metallicRoughnessTexture?.index ?? null,
    metallicFactor: pbr.metallicFactor,
    roughnessFactor: pbr.roughnessFactor,
    normalTexture: m.normalTexture?.index ?? null,
    occlusionTexture: m.occlusionTexture?.index ?? null,
    emissiveTexture: m.emissiveTexture?.index ?? null,
    extensions: Object.keys(m.extensions || {}),
  };
});

const report = {
  path,
  bytes: buf.length,
  triangles: Math.round(triangles),
  images: (gltf.images || []).length,
  textures: (gltf.textures || []).length,
  materials,
  meshes: (gltf.meshes || []).map((m) => ({
    name: m.name,
    primitives: (m.primitives || []).length,
  })),
  skins: (gltf.skins || []).length,
  animations: (gltf.animations || []).length,
};

const text = JSON.stringify(report, null, 2);
if (out) writeFileSync(out, text);
console.log(text);
