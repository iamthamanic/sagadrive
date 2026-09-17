/**
 * Allowlisted trait asset keys — Infrastructure only.
 * Location: src/infrastructure/character/avatar/trait-asset-allowlist.ts
 *
 * Maps logical trait ids to opaque asset keys. No free remote URLs.
 * Mesh swap assets land later; keys stay stable for persistence.
 */

import {
  getTraitOption,
  isAllowedTraitId,
  type AvatarTraitGroupId,
} from '../../../domains/character/avatar';

/** Opaque allowlisted key — never a free-form https URL. */
export type TraitAssetKey = `trait:${AvatarTraitGroupId}:${string}`;

export function toTraitAssetKey(
  groupId: AvatarTraitGroupId,
  traitId: string,
): TraitAssetKey | undefined {
  const trimmed = traitId.trim();
  if (!isAllowedTraitId(groupId, trimmed)) return undefined;
  return `trait:${groupId}:${trimmed}`;
}

export function parseTraitAssetKey(
  assetKey: string,
): { groupId: AvatarTraitGroupId; traitId: string } | undefined {
  const match = /^trait:(head|ears|hair|clothing|accessory):([a-z0-9-]+)$/.exec(assetKey.trim());
  if (!match) return undefined;
  const groupId = match[1] as AvatarTraitGroupId;
  const traitId = match[2];
  if (!isAllowedTraitId(groupId, traitId)) return undefined;
  return { groupId, traitId };
}

export function resolveTraitDisplayName(
  groupId: AvatarTraitGroupId,
  traitId: string,
): string {
  return getTraitOption(groupId, traitId)?.label ?? traitId;
}
