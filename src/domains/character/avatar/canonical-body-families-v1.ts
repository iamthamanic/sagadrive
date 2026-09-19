/**
 * Canonical Body Families Standard / Compact / Heavy — pure domain (#255).
 * Location: src/domains/character/avatar/canonical-body-families-v1.ts
 *
 * Three versioned humanoid base bodies sharing the same Rig/Morph/MToon contracts.
 * Legacy `sagadrive-base-humanoid-v1` maps to standard. No baked clothing; underwear separate.
 */

import {
  BASE_BODY_CONTRACT_VERSION,
  BASE_BODY_MATERIAL_SLOTS,
  BASE_BODY_TRAIT_SOCKETS,
  DEFAULT_BASE_BODY_FIT_RANGES,
  createCanonicalMorphTargetMap,
  type BaseBodyMaterialSlot,
  type BaseBodyProvenance,
  type BaseBodyTraitSocket,
  type SagaDriveBaseBodyManifestV1,
} from './base-body-contract';
import { MORPH_CONTRACT_VERSION } from './morph-contract';
import { RIG_CONTRACT_VERSION } from './rig-contract';
import type { AvatarV2BodyFamily } from './composition-contract-v2';
import {
  ASSET_AUTHORING_CONTRACT_VERSION,
  type AssetAuthoringProvenanceV1,
} from './asset-authoring-contract-v1';

export const CANONICAL_BODY_FAMILIES_CONTRACT_VERSION =
  'SagaDriveCanonicalBodyFamiliesV1' as const;

export const CANONICAL_BODY_FAMILY_IDS = ['standard', 'compact', 'heavy'] as const;
export type CanonicalBodyFamilyId = (typeof CANONICAL_BODY_FAMILY_IDS)[number];

export const CANONICAL_BODY_ASSET_IDS = {
  standard: 'sd_body_standard_v1',
  compact: 'sd_body_compact_v1',
  heavy: 'sd_body_heavy_v1',
} as const satisfies Record<CanonicalBodyFamilyId, string>;

export type CanonicalBodyAssetId =
  (typeof CANONICAL_BODY_ASSET_IDS)[CanonicalBodyFamilyId];

/** Legacy single-humanoid id — treat as standard. */
export const LEGACY_BASE_BODY_ASSET_ID = 'sagadrive-base-humanoid-v1' as const;

export const CANONICAL_BODY_REGIONS = [
  'head',
  'torso',
  'arms',
  'hands',
  'legs',
  'feet',
  'underwear',
] as const;
export type CanonicalBodyRegion = (typeof CANONICAL_BODY_REGIONS)[number];

export interface CanonicalBodyFamilyManifestV1 {
  contractVersion: typeof CANONICAL_BODY_FAMILIES_CONTRACT_VERSION;
  baseBodyContractVersion: typeof BASE_BODY_CONTRACT_VERSION;
  authoringContractVersion: typeof ASSET_AUTHORING_CONTRACT_VERSION;
  familyId: CanonicalBodyFamilyId;
  /** Maps onto Avatar V2 bodyFamily axis. */
  bodyFamily: Extract<AvatarV2BodyFamily, 'standard' | 'compact' | 'heavy'>;
  assetId: CanonicalBodyAssetId;
  assetVersion: string;
  displayNameDe: string;
  selfHostedPath: string;
  format: 'vrm' | 'glb';
  /** Baked everyday clothing is forbidden; underwear is a separate neutral layer. */
  underwearPolicy: 'separate-neutral';
  bakedClothingForbidden: true;
  bodyRegions: readonly CanonicalBodyRegion[];
  materialSlots: readonly BaseBodyMaterialSlot[];
  traitSockets: readonly BaseBodyTraitSocket[];
  morphTargetCount: number;
  provenance: BaseBodyProvenance;
  authoringProvenance: AssetAuthoringProvenanceV1;
  goldenVisualRef: string;
}

const SHARED_PROVENANCE: BaseBodyProvenance = {
  licenseSpdx: 'LicenseRef-SagaDrive-Internal',
  licenseUrl: 'https://sagadrive.local/licenses/internal',
  source: 'SagaDrive first-party authoring (#255)',
  notes: 'Adult stylized MToon; no chibi; underwear separate from base mesh.',
};

const SHARED_AUTHORING: AssetAuthoringProvenanceV1 = {
  license: 'first-party',
  attributionDe: 'SagaDrive First-Party Base Body',
};

const FAMILY_META: Record<
  CanonicalBodyFamilyId,
  { displayNameDe: string; assetVersion: string; goldenVisualRef: string }
> = {
  standard: {
    displayNameDe: 'Standard Körper',
    assetVersion: 'sd_body_standard_v1.0.0',
    goldenVisualRef: 'fixtures/avatar-v2/golden/body-standard-mtoon.json',
  },
  compact: {
    displayNameDe: 'Compact Körper',
    assetVersion: 'sd_body_compact_v1.0.0',
    goldenVisualRef: 'fixtures/avatar-v2/golden/body-compact-mtoon.json',
  },
  heavy: {
    displayNameDe: 'Heavy Körper',
    assetVersion: 'sd_body_heavy_v1.0.0',
    goldenVisualRef: 'fixtures/avatar-v2/golden/body-heavy-mtoon.json',
  },
};

export function isCanonicalBodyFamilyId(value: unknown): value is CanonicalBodyFamilyId {
  return (
    typeof value === 'string' &&
    (CANONICAL_BODY_FAMILY_IDS as readonly string[]).includes(value)
  );
}

export function resolveCanonicalBodyFamilyId(
  assetIdOrFamily: string,
): CanonicalBodyFamilyId | null {
  if (assetIdOrFamily === LEGACY_BASE_BODY_ASSET_ID) return 'standard';
  if (isCanonicalBodyFamilyId(assetIdOrFamily)) return assetIdOrFamily;
  for (const id of CANONICAL_BODY_FAMILY_IDS) {
    if (CANONICAL_BODY_ASSET_IDS[id] === assetIdOrFamily) return id;
  }
  return null;
}

export function createCanonicalBodyFamilyManifest(
  familyId: CanonicalBodyFamilyId,
): CanonicalBodyFamilyManifestV1 {
  const meta = FAMILY_META[familyId];
  const assetId = CANONICAL_BODY_ASSET_IDS[familyId];
  const morphTargets = createCanonicalMorphTargetMap();
  const morphTargetCount =
    Object.keys(morphTargets.body).length + Object.keys(morphTargets.face).length;
  return {
    contractVersion: CANONICAL_BODY_FAMILIES_CONTRACT_VERSION,
    baseBodyContractVersion: BASE_BODY_CONTRACT_VERSION,
    authoringContractVersion: ASSET_AUTHORING_CONTRACT_VERSION,
    familyId,
    bodyFamily: familyId,
    assetId,
    assetVersion: meta.assetVersion,
    displayNameDe: meta.displayNameDe,
    selfHostedPath: `${assetId}.vrm`,
    format: 'vrm',
    underwearPolicy: 'separate-neutral',
    bakedClothingForbidden: true,
    bodyRegions: [...CANONICAL_BODY_REGIONS],
    materialSlots: [...BASE_BODY_MATERIAL_SLOTS],
    traitSockets: [...BASE_BODY_TRAIT_SOCKETS],
    morphTargetCount,
    provenance: SHARED_PROVENANCE,
    authoringProvenance: SHARED_AUTHORING,
    goldenVisualRef: meta.goldenVisualRef,
  };
}

export function listCanonicalBodyFamilyManifests(): readonly CanonicalBodyFamilyManifestV1[] {
  return CANONICAL_BODY_FAMILY_IDS.map(createCanonicalBodyFamilyManifest);
}

/** Project family manifest onto SagaDriveBaseBodyManifestV1 shape for callers. */
export function toSagaDriveBaseBodyManifest(
  family: CanonicalBodyFamilyManifestV1,
): SagaDriveBaseBodyManifestV1 {
  return {
    contractVersion: BASE_BODY_CONTRACT_VERSION,
    assetVersion: family.assetVersion,
    rigVersion: RIG_CONTRACT_VERSION,
    morphContractVersion: MORPH_CONTRACT_VERSION,
    assetId: family.assetId,
    displayNameDe: family.displayNameDe,
    selfHostedPath: family.selfHostedPath,
    format: family.format,
    morphTargets: createCanonicalMorphTargetMap(),
    materialSlots: family.materialSlots,
    traitSockets: family.traitSockets,
    fitRanges: DEFAULT_BASE_BODY_FIT_RANGES,
    provenance: family.provenance,
  };
}

export interface CanonicalBodyPublishGateResult {
  ok: boolean;
  issues: readonly string[];
}

/**
 * Fail closed if required morph/region/material slots missing or baked clothing claimed.
 */
export function assertCanonicalBodyPublishable(input: {
  family: CanonicalBodyFamilyManifestV1;
  presentMorphTargetNames: readonly string[];
  claimsBakedClothing?: boolean;
}): CanonicalBodyPublishGateResult {
  const issues: string[] = [];
  const morphTargets = createCanonicalMorphTargetMap();
  const required = [
    ...Object.values(morphTargets.body),
    ...Object.values(morphTargets.face),
  ];
  const present = new Set(input.presentMorphTargetNames);
  for (const name of required) {
    if (!present.has(name)) {
      issues.push(`Missing morph target: ${name}`);
    }
  }
  for (const region of CANONICAL_BODY_REGIONS) {
    if (!input.family.bodyRegions.includes(region)) {
      issues.push(`Missing body region: ${region}`);
    }
  }
  for (const slot of BASE_BODY_MATERIAL_SLOTS) {
    if (!input.family.materialSlots.includes(slot)) {
      issues.push(`Missing material slot: ${slot}`);
    }
  }
  if (input.claimsBakedClothing) {
    issues.push('Baked clothing on base body is forbidden.');
  }
  if (input.family.underwearPolicy !== 'separate-neutral') {
    issues.push('Underwear must be separate-neutral.');
  }
  if (!input.family.authoringProvenance.attributionDe.trim()) {
    issues.push('Authoring provenance required.');
  }
  return { ok: issues.length === 0, issues };
}

export function allowlistedCanonicalBodyPaths(): readonly string[] {
  return [
    ...listCanonicalBodyFamilyManifests().map((m) => m.selfHostedPath),
    // Legacy alias path remains readable → standard family.
    `${LEGACY_BASE_BODY_ASSET_ID}.vrm`,
  ];
}
