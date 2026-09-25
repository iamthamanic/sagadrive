/**
 * saga-human-canonical-v1/write-glb — write assembled parts as one skinned glTF binary.
 * Location: scripts/lib/saga-human-canonical-v1/write-glb.mjs
 *
 * Uses @gltf-transform/core only. One skin (VRM-named joints, identity rest rotations, IBM =
 * translation(−joint)), one single-primitive mesh per part, sparse morph targets named via
 * mesh.extras.targetNames, PBR materials mapped from the MakeHuman .mhmat intent.
 * Body is the first meshed node (ARKit morph seed + face anchors bind to it by name).
 */

import { Document, NodeIO } from '@gltf-transform/core';

/** Material intent per part (from the pinned .mhmat files; approximated as glTF PBR). */
export const CANONICAL_MATERIALS_V1 = Object.freeze({
  Skin: { texture: 'skin', roughness: 0.6, alphaMode: 'OPAQUE', doubleSided: false, baseColor: [1, 1, 1, 1] },
  // Eye texture: eyeball alpha 255, outer shell alpha 0 → MASK is exact and avoids intra-mesh sorting.
  Eyes: { texture: 'eyes', roughness: 0.25, alphaMode: 'MASK', doubleSided: false, baseColor: [1, 1, 1, 1] },
  Teeth: { texture: 'teeth', roughness: 0.35, alphaMode: 'OPAQUE', doubleSided: false, baseColor: [0.64, 0.64, 0.64, 1] },
  Tongue: { texture: 'tongue', roughness: 0.7, alphaMode: 'OPAQUE', doubleSided: false, baseColor: [1, 1, 1, 1] },
  Eyelashes: { texture: 'eyelashes', roughness: 0.8, alphaMode: 'BLEND', doubleSided: true, baseColor: [1, 1, 1, 1] },
  Eyebrows: { texture: 'eyebrows', roughness: 0.8, alphaMode: 'BLEND', doubleSided: true, baseColor: [1, 1, 1, 1] },
});

const PART_MATERIAL = Object.freeze({
  Body: 'Skin',
  Eyes: 'Eyes',
  Teeth: 'Teeth',
  Tongue: 'Tongue',
  Eyelashes: 'Eyelashes',
  Eyebrows: 'Eyebrows',
});

/**
 * @param {{
 *   assembled: ReturnType<import('./assemble.mjs').assembleCanonicalHuman>;
 *   textures: Record<'skin' | 'eyes' | 'teeth' | 'tongue' | 'eyelashes' | 'eyebrows', Uint8Array>;
 *   includeMorphs: boolean;
 *   generator: string;
 * }} opts
 * @returns {Promise<Uint8Array>}
 */
export async function writeCanonicalHumanGlb(opts) {
  const { assembled, textures, includeMorphs, generator } = opts;
  const doc = new Document();
  doc.getRoot().getAsset().generator = generator;
  const buffer = doc.createBuffer();

  const textureCache = new Map();
  const texture = (key) => {
    if (!textureCache.has(key)) {
      const image = textures[key];
      if (!image) throw new Error(`missing texture ${key}`);
      textureCache.set(key, doc.createTexture(key).setImage(image).setMimeType('image/png'));
    }
    return textureCache.get(key);
  };
  const materials = new Map();
  const material = (name) => {
    if (!materials.has(name)) {
      const spec = CANONICAL_MATERIALS_V1[name];
      const m = doc
        .createMaterial(name)
        .setBaseColorFactor(spec.baseColor)
        .setBaseColorTexture(texture(spec.texture))
        .setMetallicFactor(0)
        .setRoughnessFactor(spec.roughness)
        .setAlphaMode(spec.alphaMode)
        .setDoubleSided(spec.doubleSided);
      if (spec.alphaMode === 'MASK') m.setAlphaCutoff(0.5);
      materials.set(name, m);
    }
    return materials.get(name);
  };

  // Joints: identity rotations, so every bone frame is world-aligned (VRM normalized == raw).
  const jointNodes = assembled.joints.map((j) => doc.createNode(j.id).setTranslation(j.local));
  const byId = new Map(assembled.joints.map((j, i) => [j.id, jointNodes[i]]));
  assembled.joints.forEach((j, i) => {
    if (j.parent) byId.get(j.parent).addChild(jointNodes[i]);
  });
  const ibm = new Float32Array(assembled.joints.length * 16);
  assembled.joints.forEach((j, i) => {
    ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -j.world[0], -j.world[1], -j.world[2], 1], i * 16);
  });
  const skin = doc
    .createSkin('CanonicalSkin')
    .setSkeleton(byId.get('hips'))
    .setInverseBindMatrices(doc.createAccessor('InverseBindMatrices').setType('MAT4').setArray(ibm).setBuffer(buffer));
  for (const node of jointNodes) skin.addJoint(node);

  const scene = doc.createScene('Scene').addChild(byId.get('hips'));
  for (const part of assembled.parts) {
    const vertexCount = part.positions.length / 3;
    const acc = (name, type, array) => doc.createAccessor(`${part.name}_${name}`).setType(type).setArray(array).setBuffer(buffer);
    const prim = doc
      .createPrimitive()
      .setMaterial(material(PART_MATERIAL[part.name]))
      .setIndices(acc('indices', 'SCALAR', vertexCount < 65536 ? Uint16Array.from(part.indices) : part.indices))
      .setAttribute('POSITION', acc('position', 'VEC3', part.positions))
      .setAttribute('NORMAL', acc('normal', 'VEC3', part.normals))
      .setAttribute('TEXCOORD_0', acc('uv', 'VEC2', part.uvs))
      .setAttribute('JOINTS_0', acc('joints', 'VEC4', part.joints))
      .setAttribute('WEIGHTS_0', acc('weights', 'VEC4', part.weights));
    const mesh = doc.createMesh(part.name).addPrimitive(prim);
    if (includeMorphs && part.morphs.length) {
      for (const m of part.morphs) {
        const target = doc
          .createPrimitiveTarget(m.name)
          .setAttribute('POSITION', acc(`${m.name}_dpos`, 'VEC3', m.position).setSparse(true))
          .setAttribute('NORMAL', acc(`${m.name}_dnrm`, 'VEC3', m.normal).setSparse(true));
        prim.addTarget(target);
      }
      mesh.setWeights(part.morphs.map(() => 0));
      mesh.setExtras({ targetNames: part.morphs.map((m) => m.name) });
    }
    scene.addChild(doc.createNode(part.name).setMesh(mesh).setSkin(skin));
  }
  doc.getRoot().setDefaultScene(scene);

  return new NodeIO().writeBinary(doc);
}
