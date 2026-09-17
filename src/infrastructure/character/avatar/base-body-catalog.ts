/**
 * SagaDrive base-body catalog — allowlisted morphable humanoid asset metadata.
 * Location: src/infrastructure/character/avatar/base-body-catalog.ts
 *
 * Does not load meshes; resolves allowlisted paths and declared morph targets only.
 */
import {
  createSagaDriveBaseBodyManifestV1,
  listRequiredMorphTargetNames,
  resolveBaseBodyMorphCapabilities,
  type BaseBodyMorphCapabilityReport,
  type SagaDriveBaseBodyManifestV1,
} from '../../../domains/character/avatar/base-body-contract';
import { normalizeSafeUrl } from '../../../domains/character/use-cases/avatar-presets';

const ALLOWLISTED_BASE_BODY_PATHS = new Set(['sagadrive-base-humanoid-v1.vrm']);

export function getSagaDriveBaseBodyManifest(): SagaDriveBaseBodyManifestV1 {
  return createSagaDriveBaseBodyManifestV1();
}

export function isAllowlistedBaseBodyPath(path: string): boolean {
  const normalized = path.replace(/^\.\//, '').replace(/^\//, '');
  return ALLOWLISTED_BASE_BODY_PATHS.has(normalized);
}

/**
 * Resolve self-hosted base body URL from VITE_AVATAR_ASSET_BASE_URL only.
 * Arbitrary remote URLs are rejected (fail closed).
 */
export function resolveBaseBodyModelUrl(
  assetBaseUrl: string | undefined = import.meta.env.VITE_AVATAR_ASSET_BASE_URL as
    | string
    | undefined,
): string | undefined {
  const manifest = getSagaDriveBaseBodyManifest();
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
): BaseBodyMorphCapabilityReport {
  return resolveBaseBodyMorphCapabilities({
    manifest: getSagaDriveBaseBodyManifest(),
    presentMorphTargetNames,
  });
}

/** Helper for fixtures: pretend mesh exposes the full declared target set. */
export function simulateCompleteMorphTargetEvidence(): readonly string[] {
  return listRequiredMorphTargetNames(getSagaDriveBaseBodyManifest().morphTargets);
}
