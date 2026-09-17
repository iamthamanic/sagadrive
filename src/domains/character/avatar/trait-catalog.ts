/**
 * Logical avatar trait catalog — ids + labels for CharacterEditor pickers.
 * Location: src/domains/character/avatar/trait-catalog.ts
 *
 * Domain owns logical ids only. Infrastructure resolves allowlisted asset keys.
 */

import type { AvatarTraitGroupId } from './trait-layers';

export interface AvatarTraitOption {
  id: string;
  groupId: AvatarTraitGroupId;
  label: string;
  /** Optional short hint for card subtitle. */
  hint?: string;
}

const HEAD_OPTIONS: readonly AvatarTraitOption[] = [
  { id: 'human-balanced', groupId: 'head', label: 'Ausgewogen' },
  { id: 'elf-angular', groupId: 'head', label: 'Fein / kantig' },
  { id: 'dwarf-broad', groupId: 'head', label: 'Breit' },
  { id: 'halfling-soft', groupId: 'head', label: 'Weich' },
  { id: 'orc-heavy', groupId: 'head', label: 'Massiv' },
  { id: 'cyborg-angular', groupId: 'head', label: 'Synthetisch' },
  { id: 'alien-oval', groupId: 'head', label: 'Oval' },
  { id: 'neutral-soft', groupId: 'head', label: 'Neutral' },
];

const EARS_OPTIONS: readonly AvatarTraitOption[] = [
  { id: 'round', groupId: 'ears', label: 'Rund' },
  { id: 'elf-long', groupId: 'ears', label: 'Lang' },
  { id: 'orc-pointed', groupId: 'ears', label: 'Spitz' },
  { id: 'synthetic', groupId: 'ears', label: 'Synthetisch' },
  { id: 'none', groupId: 'ears', label: 'Keine sichtbar' },
];

const HAIR_OPTIONS: readonly AvatarTraitOption[] = [
  { id: 'short', groupId: 'hair', label: 'Kurz' },
  { id: 'long', groupId: 'hair', label: 'Lang' },
  { id: 'bald', groupId: 'hair', label: 'Kahl' },
  { id: 'braided', groupId: 'hair', label: 'Geflochten' },
  { id: 'wild', groupId: 'hair', label: 'Wild' },
];

const CLOTHING_OPTIONS: readonly AvatarTraitOption[] = [
  { id: 'robe', groupId: 'clothing', label: 'Robe' },
  { id: 'armor', groupId: 'clothing', label: 'Rüstungslook' },
  { id: 'leather', groupId: 'clothing', label: 'Leder' },
  { id: 'casual', groupId: 'clothing', label: 'Alltag' },
  { id: 'noble', groupId: 'clothing', label: 'Edel' },
];

const ACCESSORY_OPTIONS: readonly AvatarTraitOption[] = [
  { id: 'none', groupId: 'accessory', label: 'Keins' },
  { id: 'optic-implant', groupId: 'accessory', label: 'Optik-Implantat' },
  { id: 'earring', groupId: 'accessory', label: 'Ohrring' },
  { id: 'scar', groupId: 'accessory', label: 'Narbe' },
];

const BY_GROUP: Readonly<Record<AvatarTraitGroupId, readonly AvatarTraitOption[]>> = {
  head: HEAD_OPTIONS,
  ears: EARS_OPTIONS,
  hair: HAIR_OPTIONS,
  clothing: CLOTHING_OPTIONS,
  accessory: ACCESSORY_OPTIONS,
};

const ALL_OPTIONS: readonly AvatarTraitOption[] = [
  ...HEAD_OPTIONS,
  ...EARS_OPTIONS,
  ...HAIR_OPTIONS,
  ...CLOTHING_OPTIONS,
  ...ACCESSORY_OPTIONS,
];

const OPTION_INDEX = new Map(
  ALL_OPTIONS.map((option) => [`${option.groupId}:${option.id}`, option] as const),
);

export function listTraitOptionsForGroup(
  groupId: AvatarTraitGroupId,
): readonly AvatarTraitOption[] {
  return BY_GROUP[groupId];
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
    description: 'Kleine Details am Kopf. Temporäre Helme verstecken Haare zur Laufzeit.',
    groups: ['accessory'],
  },
];

export function traitGroupLabel(groupId: AvatarTraitGroupId): string {
  switch (groupId) {
    case 'head':
      return 'Gesicht';
    case 'ears':
      return 'Ohren';
    case 'hair':
      return 'Frisur';
    case 'clothing':
      return 'Kleidung';
    case 'accessory':
      return 'Accessoire';
    default: {
      const _exhaustive: never = groupId;
      return _exhaustive;
    }
  }
}
