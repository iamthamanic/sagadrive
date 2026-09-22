/**
 * liveact-face-anchor-validate — deterministic manifest ↔ GLB reference checks (#399).
 * Location: scripts/lib/liveact-face-anchor-validate.mjs
 */

import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import {
  FACE_ANCHORS_CONTRACT_VERSION,
  isSagaDriveFaceAnchorId,
} from './liveact-face-anchor-ids.mjs';
import { countTrianglesForNodePrimitive, findNodeByIdentity } from './liveact-face-anchor-glb.mjs';

const BARYCENTRIC_SUM_EPS = 1e-3;

/**
 * @param {{ u: number; v: number; w: number }} barycentric
 */
export function validateBarycentricOffline(barycentric) {
  const { u, v, w } = barycentric;
  if (!Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(w)) {
    return 'barycentric_non_finite';
  }
  if (u < 0 || v < 0 || w < 0) return 'barycentric_negative';
  if (Math.abs(u + v + w - 1) > BARYCENTRIC_SUM_EPS) return 'barycentric_sum';
  return null;
}

/**
 * @param {unknown} raw
 */
export function parseManifestEnvelope(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['manifest_not_object'] };
  }
  const record = /** @type {Record<string, unknown>} */ (raw);
  if (record.contractVersion !== FACE_ANCHORS_CONTRACT_VERSION) {
    return { ok: false, errors: ['contract_version_mismatch'] };
  }
  const anchors = record.anchors;
  if (!anchors || typeof anchors !== 'object' || Array.isArray(anchors)) {
    return { ok: false, errors: ['anchors_not_object'] };
  }
  return { ok: true, anchors: /** @type {Record<string, unknown>} */ (anchors) };
}

/**
 * Validate manifest bindings against a parsed glTF document (topology only).
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 */
export function validateFaceAnchorsAgainstDocument(document, anchors) {
  /** @type {string[]} */
  const errors = [];

  for (const [anchorId, bindingRaw] of Object.entries(anchors)) {
    if (!isSagaDriveFaceAnchorId(anchorId)) {
      errors.push(`unknown_anchor:${anchorId}`);
      continue;
    }
    if (!bindingRaw || typeof bindingRaw !== 'object') {
      errors.push(`binding_missing:${anchorId}`);
      continue;
    }
    const binding = /** @type {Record<string, unknown>} */ (bindingRaw);
    const nodeIdentity = typeof binding.nodeIdentity === 'string' ? binding.nodeIdentity.trim() : '';
    if (!nodeIdentity) {
      errors.push(`node_identity_empty:${anchorId}`);
      continue;
    }

    const primitiveIndex =
      typeof binding.primitiveIndex === 'number' ? binding.primitiveIndex : Number.NaN;
    const triangleIndex =
      typeof binding.triangleIndex === 'number' ? binding.triangleIndex : Number.NaN;

    if (!Number.isInteger(primitiveIndex) || primitiveIndex < 0) {
      errors.push(`invalid_primitive:${anchorId}`);
      continue;
    }
    if (!Number.isInteger(triangleIndex) || triangleIndex < 0) {
      errors.push(`invalid_triangle:${anchorId}`);
      continue;
    }

    const baryRaw = binding.barycentric;
    if (!baryRaw || typeof baryRaw !== 'object') {
      errors.push(`barycentric_missing:${anchorId}`);
      continue;
    }
    const bary = /** @type {Record<string, number>} */ (baryRaw);
    const baryErr = validateBarycentricOffline({ u: bary.u, v: bary.v, w: bary.w });
    if (baryErr) {
      errors.push(`${baryErr}:${anchorId}`);
      continue;
    }

    const node = findNodeByIdentity(document, nodeIdentity);
    if (!node) {
      errors.push(`stale_node:${anchorId}:${nodeIdentity}`);
      continue;
    }
    const mesh = node.getMesh();
    if (!mesh) {
      errors.push(`node_no_mesh:${anchorId}`);
      continue;
    }
    const primCount = mesh.listPrimitives().length;
    if (primitiveIndex >= primCount) {
      errors.push(`stale_primitive:${anchorId}:${primitiveIndex}`);
      continue;
    }
    const triCount = countTrianglesForNodePrimitive(node, primitiveIndex);
    if (triangleIndex >= triCount) {
      errors.push(`stale_triangle:${anchorId}:${triangleIndex}`);
    }
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)].sort() };
}

/**
 * @param {{ manifestPath: string; glbPath: string }} opts
 */
export async function validateFaceAnchorsManifestFile(opts) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(opts.manifestPath, 'utf8'));
  } catch {
    return { ok: false, errors: ['manifest_read_failed'] };
  }

  const envelope = parseManifestEnvelope(raw);
  if (!envelope.ok) return { ok: false, errors: envelope.errors };

  let document;
  try {
    const io = new NodeIO();
    const bytes = readFileSync(opts.glbPath);
    document = await io.readBinary(new Uint8Array(bytes));
  } catch {
    return { ok: false, errors: ['glb_parse_failed'] };
  }

  return validateFaceAnchorsAgainstDocument(document, envelope.anchors);
}
