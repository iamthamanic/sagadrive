/**
 * SagaDrive base-body catalog — allowlisted morphable humanoid family assets (#255).
 * Location: src/infrastructure/character/avatar/base-body-catalog.ts
 *
 * Does not load meshes; resolves allowlisted paths and declared morph targets only.
 * Canonical families: standard / compact / heavy. Legacy path aliases to standard.
 */
import {
  createSagaDriveBaseBodyManifestV1,
  listRequiredMorphTargetNames,
  resolveBaseBodyMorphCapabilities,
  type BaseBodyMorphCapabilityReport,
  type SagaDriveBaseBodyManifestV1,
} from '../../../domains/character/avatar/base-body-contract';
import {
  allowlistedCanonicalBodyPaths,
  createCanonicalBodyFamilyManifest,
  resolveCanonicalBodyFamilyId,
  toSagaDriveBaseBodyManifest,
  type CanonicalBodyFamilyId,
} from '../../../domains/character/avatar/canonical-body-families-v1';
import { normalizeSafeUrl } from '../../../domains/character/use-cases/avatar-presets';

const ALLOWLISTED_BASE_BODY_PATHS = new Set(allowlistedCanonicalBodyPaths());

export function getSagaDriveBaseBodyManifest(
  familyId: CanonicalBodyFamilyId = 'standard',
): SagaDriveBaseBodyManifestV1 {
  return toSagaDriveBaseBodyManifest(createCanonicalBodyFamilyManifest(familyId));
}

/** @deprecated Prefer getSagaDriveBaseBodyManifest('standard') — kept for call sites. */
export function getLegacySagaDriveBaseBodyManifest(): SagaDriveBaseBodyManifestV1 {
  return createSagaDriveBaseBodyManifestV1();
}

export function isAllowlistedBaseBodyPath(path: string): boolean {
  const normalized = path.replace(/^\.\//, '').replace(/^\//, '');
  return ALLOWLISTED_BASE_BODY_PATHS.has(normalized);
}

export function resolveBaseBodyFamilyFromPath(path: string): CanonicalBodyFamilyId | null {
  const normalized = path.replace(/^\.\//, '').replace(/^\//, '').replace(/\.vrm$/i, '');
  return resolveCanonicalBodyFamilyId(normalized);
}

/**
 * Resolve self-hosted base body URL from VITE_AVATAR_ASSET_BASE_URL only.
 * Arbitrary remote URLs are rejected (fail closed).
 */
export function resolveBaseBodyModelUrl(
  assetBaseUrl: string | undefined = import.meta.env.VITE_AVATAR_ASSET_BASE_URL as
    | string
    | undefined,
  familyId: CanonicalBodyFamilyId = 'standard',
): string | undefined {
  const manifest = getSagaDriveBaseBodyManifest(familyId);
  if (!isAllowlistedBaseBodyPath(manifest.selfHostedPath)) return undefined;
  if (!assetBaseUrl) return undefined;

  const base = normalizeSafeUrl(assetBaseUrl);
  if (!base) return undefined;

  if (base.startsWith('/')) {
    return `${base.replace(/\/$/, '')}/${manifest.selfHostedPath}`;
  }

  try {
    return new URL(manifest.selfHostedPath, base.endsWith('/') ? base : `${base}/`).toString();
  } catch {
    return undefined;
  }
}

export function evaluateBaseBodyMorphReadiness(
  presentMorphTargetNames: readonly string[],
  familyId: CanonicalBodyFamilyId = 'standard',
): BaseBodyMorphCapabilityReport {
  return resolveBaseBodyMorphCapabilities({
    manifest: getSagaDriveBaseBodyManifest(familyId),
    presentMorphTargetNames,
  });
}

/** Helper for fixtures: pretend mesh exposes the full declared target set. */
export function simulateCompleteMorphTargetEvidence(
  familyId: CanonicalBodyFamilyId = 'standard',
): readonly string[] {
  return listRequiredMorphTargetNames(getSagaDriveBaseBodyManifest(familyId).morphTargets);
}
