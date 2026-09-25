/**
 * gltf-transform-vrm1-extension — attach VRMC_vrm 1.0 JSON onto a glTF Document (#404).
 * Location: scripts/lib/gltf-transform-vrm1-extension.mjs
 *
 * Offline packaging only — not shipped in the app bundle.
 * Stores the full VRMC_vrm payload on the glTF JSON root and encodes a GLB without
 * round-tripping through Document (unknown extensions would otherwise be dropped).
 */

import { BufferUtils, GLB_BUFFER } from '@gltf-transform/core';

export const VRMC_VRM_EXTENSION_NAME = 'VRMC_vrm';
export const VRMC_VRM_SPEC_VERSION = '1.0';

/**
 * Merge VRMC_vrm into a glTF JSON document (readAsJSON shape).
 * @param {import('@gltf-transform/core').JSONDocument} jsonDoc
 * @param {object} vrmcVrm — VRMC_vrm 1.0 root object
 */
export function attachVrmcVrm1Extension(jsonDoc, vrmcVrm) {
  if (!jsonDoc || typeof jsonDoc !== 'object' || !jsonDoc.json) {
    throw new Error('attachVrmcVrm1Extension: invalid JSONDocument');
  }
  const json = jsonDoc.json;
  const used = new Set(Array.isArray(json.extensionsUsed) ? json.extensionsUsed : []);
  used.add(VRMC_VRM_EXTENSION_NAME);
  json.extensionsUsed = [...used];

  const required = Array.isArray(json.extensionsRequired) ? json.extensionsRequired : [];
  const stillRequired = required.filter((n) => n !== VRMC_VRM_EXTENSION_NAME);
  // glTF forbids empty arrays (Khronos EMPTY_ENTITY error).
  if (stillRequired.length) json.extensionsRequired = stillRequired;
  else delete json.extensionsRequired;

  json.extensions = {
    ...(json.extensions && typeof json.extensions === 'object' ? json.extensions : {}),
    [VRMC_VRM_EXTENSION_NAME]: vrmcVrm,
  };
  return jsonDoc;
}

/**
 * Encode a JSONDocument to GLB bytes, preserving root extensions.
 * @param {import('@gltf-transform/core').JSONDocument} jsonDoc
 * @returns {Uint8Array}
 */
export function encodeGlbFromJsonDocument(jsonDoc) {
  const json = jsonDoc.json;
  const resources = jsonDoc.resources || {};
  const bin =
    resources[GLB_BUFFER] ||
    resources['@glb.bin'] ||
    Object.values(resources).find((v) => v instanceof Uint8Array) ||
    new Uint8Array(0);

  // Ensure buffer.uri is omitted for GLB-embedded BIN.
  if (Array.isArray(json.buffers) && json.buffers[0]) {
    const buf0 = { ...json.buffers[0] };
    delete buf0.uri;
    buf0.byteLength = bin.byteLength;
    json.buffers = [buf0, ...json.buffers.slice(1)];
  }

  const jsonText = JSON.stringify(json);
  const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
  const binChunkData = BufferUtils.pad(bin, 0x00);

  const total =
    12 +
    8 +
    jsonChunkData.byteLength +
    (binChunkData.byteLength ? 8 + binChunkData.byteLength : 0);

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(0, 0x46546c67, true); // glTF
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  let offset = 12;
  view.setUint32(offset, jsonChunkData.byteLength, true);
  view.setUint32(offset + 4, 0x4e4f534a, true); // JSON
  out.set(jsonChunkData, offset + 8);
  offset += 8 + jsonChunkData.byteLength;

  if (binChunkData.byteLength) {
    view.setUint32(offset, binChunkData.byteLength, true);
    view.setUint32(offset + 4, 0x004e4942, true); // BIN\0
    out.set(binChunkData, offset + 8);
  }
  return out;
}
