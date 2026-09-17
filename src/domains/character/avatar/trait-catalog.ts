/**
 * Logical avatar trait catalog — ids + labels for CharacterEditor pickers.
 * Location: src/domains/character/avatar/trait-catalog.ts
 *
 * Domain owns logical ids only. Infrastructure resolves allowlisted asset keys.
 * Options are sourced from Content Pack v1 (#217) so Fantasy/Sci-Fi coverage stays complete.
 */

import type { AvatarTraitGroupId } from './trait-layers';
import {
  CONTENT_PACK_V1_ASSETS,
  listContentPackAssets,
  type ContentPackSetting,
} from './content-pack-v1';

export interface AvatarTraitOption {
  id: string;
  groupId: AvatarTraitGroupId;
  label: string;
  /** Optional short hint for card subtitle. */
  hint?: string;
  setting?: ContentPackSetting;
  tags?: readonly string[];
}

function toOption(asset: {
  id: string;
  groupId: AvatarTraitGroupId;
  label: string;
  setting: ContentPackSetting;
  tags: readonly string[];
  category: string;
}): AvatarTraitOption {
  return {
    id: asset.id,
    groupId: asset.groupId,
    label: asset.label,
    hint: asset.category,
    setting: asset.setting,
    tags: asset.tags,
  };
}

/** Unique options per group (first wins when same id appears twice). */
function buildGroupOptions(): Readonly<Record<AvatarTraitGroupId, readonly AvatarTraitOption[]>> {
  const buckets: Record<AvatarTraitGroupId, AvatarTraitOption[]> = {
    head: [],
    ears: [],
    hair: [],
    clothing: [],
    accessory: [],
  };
  const seen = new Set<string>();
  for (const asset of CONTENT_PACK_V1_ASSETS) {
    const key = `${asset.groupId}:${asset.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    buckets[asset.groupId].push(toOption(asset));
  }
  return buckets;
}

const BY_GROUP = buildGroupOptions();

const ALL_OPTIONS: readonly AvatarTraitOption[] = [
  ...BY_GROUP.head,
  ...BY_GROUP.ears,
  ...BY_GROUP.hair,
  ...BY_GROUP.clothing,
  ...BY_GROUP.accessory,
];

const OPTION_INDEX = new Map(
  ALL_OPTIONS.map((option) => [`${option.groupId}:${option.id}`, option] as const),
);

export function listTraitOptionsForGroup(
  groupId: AvatarTraitGroupId,
  filter?: { setting?: ContentPackSetting | 'all' },
): readonly AvatarTraitOption[] {
  const base = BY_GROUP[groupId];
  if (!filter?.setting || filter.setting === 'all') return base;
  return base.filter(
    (option) => option.setting === filter.setting || option.setting === 'neutral',
  );
}

export function getTraitOption(
  groupId: AvatarTraitGroupId,
  traitId: string,
): AvatarTraitOption | undefined {
  return OPTION_INDEX.get(`${groupId}:${traitId.trim()}`);
}

/** Fail-closed: unknown ids are rejected (caller keeps previous selection). */
export function isAllowedTraitId(groupId: AvatarTraitGroupId, traitId: string): boolean {
  return OPTION_INDEX.has(`${groupId}:${traitId.trim()}`);
}

export interface AvatarTraitSection {
  id: string;
  title: string;
  description: string;
  groups: readonly AvatarTraitGroupId[];
}

/** CharacterEditor card sections — Hick: few groups per section. */
export const AVATAR_TRAIT_SECTIONS: readonly AvatarTraitSection[] = [
  {
    id: 'features',
    title: 'Haare & Merkmale',
    description: 'Gesicht, Ohren und Frisur — live in der Vorschau.',
    groups: ['head', 'ears', 'hair'],
  },
  {
    id: 'clothing',
    title: 'Kleidung',
    description: 'Basis-Outfit. Ausrüstung aus dem Inventar kommt später als Overlay.',
    groups: ['clothing'],
  },
  {
    id: 'accessories',
    title: 'Accessoires',
    description: 'Kleine Details. Inventar-Items bleiben Overlays.',
    groups: ['accessory'],
  },
];

export function traitGroupLabel(groupId: AvatarTraitGroupId): string {
  switch (groupId) {
    case 'head':
      return 'Gesicht';
    case 'ears':
      return 'Ohren / Species';
    case 'hair':
      return 'Haare';
    case 'clothing':
      return 'Kleidung';
    case 'accessory':
      return 'Accessoire';
    default:
      return groupId;
  }
}

/** Helper for content-pack aware pickers. */
export function listTraitOptionsFromContentPack(
  groupId: AvatarTraitGroupId,
  setting: ContentPackSetting | 'all' = 'all',
): readonly AvatarTraitOption[] {
  return listContentPackAssets({ groupId, setting }).reduce<AvatarTraitOption[]>((acc, asset) => {
    if (acc.some((item) => item.id === asset.id)) return acc;
    acc.push(toOption(asset));
    return acc;
  }, []);
}
