#!/usr/bin/env node
/**
 * Rebind PBR maps from a pre-rig GLB onto a Meshy-rigged GLB when UVs are compatible.
 * Clears erroneous full-white emissive that Meshy rig often injects.
 * Location: scripts/species-authoring-rebind-pbr-maps.mjs
 *
 * Usage: node scripts/species-authoring-rebind-pbr-maps.mjs <prerig.glb> <rigged.glb> <out.glb>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';

const [prerigPath, riggedPath, outPath] = process.argv.slice(2);
if (!prerigPath || !riggedPath || !outPath) {
  console.error(
    'Usage: node scripts/species-authoring-rebind-pbr-maps.mjs <prerig.glb> <rigged.glb> <out.glb>',
  );
  process.exit(1);
}

const io = new NodeIO();
const source = await io.read(prerigPath);
const target = await io.read(riggedPath);

const srcMat = source.getRoot().listMaterials()[0];
if (!srcMat) {
  console.error('No material on prerig');
  process.exit(1);
}

const dstMats = target.getRoot().listMaterials();
if (dstMats.length === 0) {
  console.error('No material on rigged');
  process.exit(1);
}

function cloneTexture(tex) {
  if (!tex) return null;
  const image = tex.getImage();
  if (!image) return null;
  const next = target.createTexture(tex.getName() || 'copied');
  next.setImage(image.slice(0));
  next.setMimeType(tex.getMimeType() || 'image/png');
  if (tex.getURI()) next.setURI(tex.getURI());
  return next;
}

const base = cloneTexture(srcMat.getBaseColorTexture());
const mr = cloneTexture(srcMat.getMetallicRoughnessTexture());
const normal = cloneTexture(srcMat.getNormalTexture());

if (!base) {
  console.error('Prerig missing baseColorTexture — abort');
  process.exit(1);
}

for (const mat of dstMats) {
  mat.setBaseColorTexture(base);
  if (mr) mat.setMetallicRoughnessTexture(mr);
  if (normal) mat.setNormalTexture(normal);
  // Meshy rig often sets emissiveTexture = albedo + emissiveFactor 1 → glow.
  mat.setEmissiveTexture(null);
  mat.setEmissiveFactor([0, 0, 0]);
  // Keep specular/ior extensions if present; only clamp absurd specularColorFactor.
  const specular = mat.getExtension('KHR_materials_specular');
  if (specular && typeof specular.getSpecularColorFactor === 'function') {
    const c = specular.getSpecularColorFactor();
    if (Array.isArray(c) && c.some((v) => v > 1.01)) {
      specular.setSpecularColorFactor([1, 1, 1]);
    }
  }
}

const out = await io.writeBinary(target);
writeFileSync(outPath, out);
console.log(
  JSON.stringify(
    {
      outPath,
      bytes: out.byteLength,
      rebound: {
        baseColor: Boolean(base),
        metallicRoughness: Boolean(mr),
        normal: Boolean(normal),
        emissiveCleared: true,
      },
      source: prerigPath,
      target: riggedPath,
    },
    null,
    2,
  ),
);
