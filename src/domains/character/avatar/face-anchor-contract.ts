/**
 * SagaDriveFaceAnchorsV1 — semantic face surface anchors on avatar meshes (#399).
 * Location: src/domains/character/avatar/face-anchor-contract.ts
 *
 * Provider-neutral: bindings use stable node identity + triangle barycentrics only.
 * Pure domain — no React, Three.js, or tracking SDK names.
 */

export const FACE_ANCHORS_CONTRACT_VERSION = 'SagaDriveFaceAnchorsV1' as const;

/** Versioned semantic anchor ids (exact set for V1). */
export const SAGA_DRIVE_FACE_ANCHOR_IDS = [
  'mouthUpper',
  'mouthLower',
  'mouthCornerLeft',
  'mouthCornerRight',
  'eyeLeftInner',
  'eyeLeftOuter',
  'eyeLeftUpper',
  'eyeLeftLower',
  'eyeRightInner',
  'eyeRightOuter',
  'eyeRightUpper',
  'eyeRightLower',
  'browLeftInner',
  'browLeftOuter',
  'browLeftCenter',
  'browRightInner',
  'browRightOuter',
  'browRightCenter',
  'noseTip',
  'chin',
  'forehead',
] as const;

export type SagaDriveFaceAnchorId = (typeof SAGA_DRIVE_FACE_ANCHOR_IDS)[number];

/** Barycentric weights on a triangle (u + v + w ≈ 1). */
export interface SagaDriveFaceAnchorBarycentric {
  readonly u: number;
  readonly v: number;
  readonly w: number;
}

/**
 * Runtime/manifest binding: point on a mesh primitive triangle.
 * `nodeIdentity` is the stable glTF node id (name or authored path token), not a runtime object ref.
 */
export interface SagaDriveFaceAnchorTriangleBinding {
  readonly nodeIdentity: string;
  readonly primitiveIndex: number;
  readonly triangleIndex: number;
  readonly barycentric: SagaDriveFaceAnchorBarycentric;
}

export interface SagaDriveFaceAnchorsManifestV1 {
  readonly contractVersion: typeof FACE_ANCHORS_CONTRACT_VERSION;
  readonly anchors: Readonly<Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>>>;
}

export interface SagaDriveFaceAnchorBindingValidationIssue {
  readonly code:
    | 'invalid_anchor_id'
    | 'invalid_node_identity'
    | 'invalid_primitive_index'
    | 'invalid_triangle_index'
    | 'invalid_barycentric'
    | 'contract_version_mismatch';
  readonly anchorId?: SagaDriveFaceAnchorId;
  readonly detail: string;
}

export interface SagaDriveFaceAnchorBindingValidationResult {
  readonly ok: boolean;
  readonly issues: readonly SagaDriveFaceAnchorBindingValidationIssue[];
}

const BARYCENTRIC_EPS = 1e-4;
const BARYCENTRIC_SUM_EPS = 1e-3;

export function isSagaDriveFaceAnchorId(id: string): id is SagaDriveFaceAnchorId {
  return (SAGA_DRIVE_FACE_ANCHOR_IDS as readonly string[]).includes(id);
}

export function validateFaceAnchorBarycentric(
  barycentric: SagaDriveFaceAnchorBarycentric,
): SagaDriveFaceAnchorBindingValidationIssue | null {
  const { u, v, w } = barycentric;
  if (!Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(w)) {
    return { code: 'invalid_barycentric', detail: 'Barycentric components must be finite numbers.' };
  }
  if (u < -BARYCENTRIC_EPS || v < -BARYCENTRIC_EPS || w < -BARYCENTRIC_EPS) {
    return { code: 'invalid_barycentric', detail: 'Barycentric weights must be non-negative.' };
  }
  const sum = u + v + w;
  if (Math.abs(sum - 1) > BARYCENTRIC_SUM_EPS) {
    return {
      code: 'invalid_barycentric',
      detail: `Barycentric weights must sum to 1 (got ${sum}).`,
    };
  }
  return null;
}

export function validateFaceAnchorTriangleBinding(
  binding: SagaDriveFaceAnchorTriangleBinding,
  anchorId?: SagaDriveFaceAnchorId,
): SagaDriveFaceAnchorBindingValidationResult {
  const issues: SagaDriveFaceAnchorBindingValidationIssue[] = [];

  const nodeIdentity = binding.nodeIdentity.trim();
  if (!nodeIdentity) {
    issues.push({
      code: 'invalid_node_identity',
      anchorId,
      detail: 'nodeIdentity must be a non-empty stable node id.',
    });
  }

  if (!Number.isInteger(binding.primitiveIndex) || binding.primitiveIndex < 0) {
    issues.push({
      code: 'invalid_primitive_index',
      anchorId,
      detail: 'primitiveIndex must be a non-negative integer.',
    });
  }

  if (!Number.isInteger(binding.triangleIndex) || binding.triangleIndex < 0) {
    issues.push({
      code: 'invalid_triangle_index',
      anchorId,
      detail: 'triangleIndex must be a non-negative integer.',
    });
  }

  const baryIssue = validateFaceAnchorBarycentric(binding.barycentric);
  if (baryIssue) {
    issues.push({ ...baryIssue, anchorId });
  }

  return { ok: issues.length === 0, issues };
}

export function validateFaceAnchorsManifestV1(
  manifest: SagaDriveFaceAnchorsManifestV1,
): SagaDriveFaceAnchorBindingValidationResult {
  const issues: SagaDriveFaceAnchorBindingValidationIssue[] = [];

  if (manifest.contractVersion !== FACE_ANCHORS_CONTRACT_VERSION) {
    issues.push({
      code: 'contract_version_mismatch',
      detail: `Expected ${FACE_ANCHORS_CONTRACT_VERSION}, got ${String(manifest.contractVersion)}.`,
    });
  }

  for (const [rawId, binding] of Object.entries(manifest.anchors)) {
    if (!isSagaDriveFaceAnchorId(rawId)) {
      issues.push({
        code: 'invalid_anchor_id',
        detail: `Unknown anchor id: ${rawId}`,
      });
      continue;
    }
    if (!binding) continue;
    const one = validateFaceAnchorTriangleBinding(binding, rawId);
    issues.push(...one.issues);
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Fail-closed parse: rejects unknown keys, wrong version, and invalid bindings.
 */
export function parseFaceAnchorsManifestV1(input: unknown):
  | { ok: true; manifest: SagaDriveFaceAnchorsManifestV1 }
  | { ok: false; issues: readonly SagaDriveFaceAnchorBindingValidationIssue[] } {
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      issues: [{ code: 'contract_version_mismatch', detail: 'Manifest must be a JSON object.' }],
    };
  }

  const record = input as Record<string, unknown>;
  const version = record.contractVersion;
  const anchorsRaw = record.anchors;

  if (version !== FACE_ANCHORS_CONTRACT_VERSION) {
    return {
      ok: false,
      issues: [
        {
          code: 'contract_version_mismatch',
          detail: `Expected ${FACE_ANCHORS_CONTRACT_VERSION}.`,
        },
      ],
    };
  }

  if (!anchorsRaw || typeof anchorsRaw !== 'object' || Array.isArray(anchorsRaw)) {
    return {
      ok: false,
      issues: [{ code: 'invalid_anchor_id', detail: 'anchors must be an object map.' }],
    };
  }

  const anchors: Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>> = {};

  for (const [key, value] of Object.entries(anchorsRaw)) {
    if (!isSagaDriveFaceAnchorId(key)) {
      return {
        ok: false,
        issues: [{ code: 'invalid_anchor_id', detail: `Unknown anchor id: ${key}` }],
      };
    }
    if (value === undefined || value === null) continue;
    if (typeof value !== 'object') {
      return {
        ok: false,
        issues: [{ code: 'invalid_node_identity', anchorId: key, detail: 'Binding must be an object.' }],
      };
    }
    const b = value as Record<string, unknown>;
    const baryRaw = b.barycentric;
    if (!baryRaw || typeof baryRaw !== 'object') {
      return {
        ok: false,
        issues: [{ code: 'invalid_barycentric', anchorId: key, detail: 'Missing barycentric object.' }],
      };
    }
    const baryObj = baryRaw as Record<string, unknown>;
    const binding: SagaDriveFaceAnchorTriangleBinding = {
      nodeIdentity: typeof b.nodeIdentity === 'string' ? b.nodeIdentity : '',
      primitiveIndex: typeof b.primitiveIndex === 'number' ? b.primitiveIndex : -1,
      triangleIndex: typeof b.triangleIndex === 'number' ? b.triangleIndex : -1,
      barycentric: {
        u: typeof baryObj.u === 'number' ? baryObj.u : Number.NaN,
        v: typeof baryObj.v === 'number' ? baryObj.v : Number.NaN,
        w: typeof baryObj.w === 'number' ? baryObj.w : Number.NaN,
      },
    };
    anchors[key] = binding;
  }

  const manifest: SagaDriveFaceAnchorsManifestV1 = {
    contractVersion: FACE_ANCHORS_CONTRACT_VERSION,
    anchors,
  };

  const validated = validateFaceAnchorsManifestV1(manifest);
  if (!validated.ok) {
    return { ok: false, issues: validated.issues };
  }
  return { ok: true, manifest };
}

/** Deterministic manifest checksum input (stable key order). */
export function stableFaceAnchorsManifestJson(manifest: SagaDriveFaceAnchorsManifestV1): string {
  const ordered: Record<string, SagaDriveFaceAnchorTriangleBinding> = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = manifest.anchors[id];
    if (binding) ordered[id] = binding;
  }
  return JSON.stringify({
    contractVersion: manifest.contractVersion,
    anchors: ordered,
  });
}
