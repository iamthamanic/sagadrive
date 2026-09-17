/**
 * SagaDrive Avatar Content Pack v1 — curated Fantasy/Sci-Fi creator assets.
 * Location: src/domains/character/avatar/content-pack-v1.ts
 *
 * Metadata only (no React / Three / remote URLs). Trait ids remain logical;
 * Infrastructure resolves allowlisted keys. Fit/style versions are stamps, not
 * client-claimed capability upgrades.
 */

import {
  type AvatarFitRangeV1,
  createDefaultTraitFitRange,
} from './fit-range-contract';
import { MTOON_PROFILE_VERSION } from './mtoon-profile';
import { MORPH_CONTRACT_VERSION } from './morph-contract';
import { RIG_CONTRACT_VERSION } from './rig-contract';
import type { AvatarTraitGroupId } from './trait-layers';
import type { BaseBodyTraitSocket } from './base-body-contract';

export const CONTENT_PACK_VERSION = 'SagaDriveAvatarContentPackV1' as const;

export type ContentPackSetting = 'fantasy' | 'sci-fi' | 'neutral';

export type ContentPackCategory =
  | 'face'
  | 'hair'
  | 'facial-hair'
  | 'eyes'
  | 'outfit'
  | 'species-trait'
  | 'accessory'
  | 'cybernetic'
  | 'skin-marking';

export interface ContentPackLicense {
  spdx: string;
  attribution: string;
  provenance: string;
}

export interface ContentPackAssetV1 {
  id: string;
  groupId: AvatarTraitGroupId;
  category: ContentPackCategory;
  label: string;
  tags: readonly string[];
  setting: ContentPackSetting;
  rigVersion: typeof RIG_CONTRACT_VERSION;
  morphContractVersion: typeof MORPH_CONTRACT_VERSION;
  fitRange: AvatarFitRangeV1;
  materialProfile: typeof MTOON_PROFILE_VERSION;
  license: ContentPackLicense;
  /** Deterministic local swatch seed — no remote marketing thumbnails. */
  thumbnailSeed: string;
}

const LICENSE_SAGA: ContentPackLicense = {
  spdx: 'CC0-1.0',
  attribution: 'SagaDrive Content Pack v1',
  provenance: 'sagadrive-first-party',
};

function socketForGroup(groupId: AvatarTraitGroupId): BaseBodyTraitSocket {
  switch (groupId) {
    case 'ears':
      return 'ears';
    case 'hair':
      return 'hair';
    case 'clothing':
      return 'clothing';
    case 'accessory':
      return 'cybernetics';
    case 'head':
      return 'horns';
    default:
      return 'clothing';
  }
}

function asset(
  partial: Omit<
    ContentPackAssetV1,
    'rigVersion' | 'morphContractVersion' | 'fitRange' | 'materialProfile' | 'license' | 'thumbnailSeed'
  > & { license?: ContentPackLicense },
): ContentPackAssetV1 {
  return {
    ...partial,
    rigVersion: RIG_CONTRACT_VERSION,
    morphContractVersion: MORPH_CONTRACT_VERSION,
    fitRange: createDefaultTraitFitRange({
      assetId: `${partial.groupId}:${partial.id}`,
      socket: socketForGroup(partial.groupId),
    }),
    materialProfile: MTOON_PROFILE_VERSION,
    license: partial.license ?? LICENSE_SAGA,
    thumbnailSeed: `${partial.groupId}:${partial.id}`,
  };
}

/** Face / head presets (≥12). */
const FACES: readonly ContentPackAssetV1[] = [
  asset({ id: 'human-balanced', groupId: 'head', category: 'face', label: 'Mensch ausgewogen', tags: ['human'], setting: 'neutral' }),
  asset({ id: 'human-soft', groupId: 'head', category: 'face', label: 'Mensch weich', tags: ['human'], setting: 'neutral' }),
  asset({ id: 'human-angular', groupId: 'head', category: 'face', label: 'Mensch kantig', tags: ['human'], setting: 'neutral' }),
  asset({ id: 'elf-angular', groupId: 'head', category: 'face', label: 'Elf fein', tags: ['elf'], setting: 'fantasy' }),
  asset({ id: 'elf-noble', groupId: 'head', category: 'face', label: 'Elf edel', tags: ['elf'], setting: 'fantasy' }),
  asset({ id: 'dwarf-broad', groupId: 'head', category: 'face', label: 'Zwerg breit', tags: ['dwarf'], setting: 'fantasy' }),
  asset({ id: 'orc-heavy', groupId: 'head', category: 'face', label: 'Ork massiv', tags: ['orc'], setting: 'fantasy' }),
  asset({ id: 'halfling-soft', groupId: 'head', category: 'face', label: 'Halbling weich', tags: ['halfling'], setting: 'fantasy' }),
  asset({ id: 'cyborg-angular', groupId: 'head', category: 'face', label: 'Cyborg', tags: ['cyborg'], setting: 'sci-fi' }),
  asset({ id: 'cyborg-plated', groupId: 'head', category: 'face', label: 'Cyborg Panzer', tags: ['cyborg'], setting: 'sci-fi' }),
  asset({ id: 'alien-oval', groupId: 'head', category: 'face', label: 'Alien oval', tags: ['alien'], setting: 'sci-fi' }),
  asset({ id: 'alien-ridge', groupId: 'head', category: 'face', label: 'Alien Kamm', tags: ['alien'], setting: 'sci-fi' }),
  asset({ id: 'neutral-soft', groupId: 'head', category: 'face', label: 'Neutral weich', tags: ['neutral'], setting: 'neutral' }),
];

/** Hairstyles (≥16) including fantasy + sci-fi. */
const HAIR: readonly ContentPackAssetV1[] = [
  asset({ id: 'short', groupId: 'hair', category: 'hair', label: 'Kurz', tags: ['basic'], setting: 'neutral' }),
  asset({ id: 'long', groupId: 'hair', category: 'hair', label: 'Lang', tags: ['basic'], setting: 'neutral' }),
  asset({ id: 'bald', groupId: 'hair', category: 'hair', label: 'Kahl', tags: ['basic'], setting: 'neutral' }),
  asset({ id: 'braided', groupId: 'hair', category: 'hair', label: 'Geflochten', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'wild', groupId: 'hair', category: 'hair', label: 'Wild', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'topknot', groupId: 'hair', category: 'hair', label: 'Topknot', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'silver-cascade', groupId: 'hair', category: 'hair', label: 'Silberkaskade', tags: ['elf', 'fantasy'], setting: 'fantasy' }),
  asset({ id: 'warrior-mohawk', groupId: 'hair', category: 'hair', label: 'Kriegs-Iro', tags: ['orc', 'fantasy'], setting: 'fantasy' }),
  asset({ id: 'dwarf-braids', groupId: 'hair', category: 'hair', label: 'Zwergenzöpfe', tags: ['dwarf'], setting: 'fantasy' }),
  asset({ id: 'mage-hood-hair', groupId: 'hair', category: 'hair', label: 'Magierfrisur', tags: ['mage'], setting: 'fantasy' }),
  asset({ id: 'buzz-undercut', groupId: 'hair', category: 'hair', label: 'Undercut', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'neon-spikes', groupId: 'hair', category: 'hair', label: 'Neon-Spikes', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'data-cables', groupId: 'hair', category: 'hair', label: 'Datenkabel', tags: ['cyborg'], setting: 'sci-fi' }),
  asset({ id: 'zero-g-float', groupId: 'hair', category: 'hair', label: 'Zero-G', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'crew-cut', groupId: 'hair', category: 'hair', label: 'Crew Cut', tags: ['military'], setting: 'sci-fi' }),
  asset({ id: 'ponytail-tech', groupId: 'hair', category: 'hair', label: 'Tech-Pferdeschwanz', tags: ['sci-fi'], setting: 'sci-fi' }),
];

/** Facial hair (≥6) stored as hair-group options with facial-hair category. */
const FACIAL_HAIR: readonly ContentPackAssetV1[] = [
  asset({ id: 'beard-short', groupId: 'hair', category: 'facial-hair', label: 'Kurzer Bart', tags: ['beard'], setting: 'neutral' }),
  asset({ id: 'beard-full', groupId: 'hair', category: 'facial-hair', label: 'Vollbart', tags: ['beard'], setting: 'fantasy' }),
  asset({ id: 'beard-braided', groupId: 'hair', category: 'facial-hair', label: 'Flechtbart', tags: ['dwarf'], setting: 'fantasy' }),
  asset({ id: 'goatee', groupId: 'hair', category: 'facial-hair', label: 'Kinnbart', tags: ['beard'], setting: 'neutral' }),
  asset({ id: 'stubble-cyber', groupId: 'hair', category: 'facial-hair', label: 'Cyber-Stoppel', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'mustache-thin', groupId: 'hair', category: 'facial-hair', label: 'Schnurrbart', tags: ['beard'], setting: 'neutral' }),
];

/** Eye / brow variants as head-adjacent accessories (≥8). */
const EYES: readonly ContentPackAssetV1[] = [
  asset({ id: 'eyes-soft', groupId: 'accessory', category: 'eyes', label: 'Augen weich', tags: ['eyes'], setting: 'neutral' }),
  asset({ id: 'eyes-sharp', groupId: 'accessory', category: 'eyes', label: 'Augen scharf', tags: ['eyes'], setting: 'neutral' }),
  asset({ id: 'eyes-glow-elf', groupId: 'accessory', category: 'eyes', label: 'Elfenleucht', tags: ['eyes', 'fantasy'], setting: 'fantasy' }),
  asset({ id: 'eyes-orc-amber', groupId: 'accessory', category: 'eyes', label: 'Ork-Bernstein', tags: ['eyes'], setting: 'fantasy' }),
  asset({ id: 'brows-heavy', groupId: 'accessory', category: 'eyes', label: 'Brauen schwer', tags: ['brows'], setting: 'neutral' }),
  asset({ id: 'brows-arch', groupId: 'accessory', category: 'eyes', label: 'Brauen Bogen', tags: ['brows'], setting: 'neutral' }),
  asset({ id: 'eyes-visor', groupId: 'accessory', category: 'eyes', label: 'Visor-Augen', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'eyes-alien-multi', groupId: 'accessory', category: 'eyes', label: 'Alien-Iris', tags: ['alien'], setting: 'sci-fi' }),
];

/** Outfits: ≥6 fantasy + ≥6 sci-fi. */
const OUTFITS: readonly ContentPackAssetV1[] = [
  asset({ id: 'robe', groupId: 'clothing', category: 'outfit', label: 'Magierrobe', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'armor', groupId: 'clothing', category: 'outfit', label: 'Plattenrüstung', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'leather', groupId: 'clothing', category: 'outfit', label: 'Lederwams', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'noble', groupId: 'clothing', category: 'outfit', label: 'Adelsgewand', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'ranger-cloak', groupId: 'clothing', category: 'outfit', label: 'Waldläufer', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'monk-wraps', groupId: 'clothing', category: 'outfit', label: 'Mönchsbinden', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'casual', groupId: 'clothing', category: 'outfit', label: 'Alltag', tags: ['neutral'], setting: 'neutral' }),
  asset({ id: 'flight-suit', groupId: 'clothing', category: 'outfit', label: 'Fluganzug', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'corpo-suit', groupId: 'clothing', category: 'outfit', label: 'Corpo-Anzug', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'street-synth', groupId: 'clothing', category: 'outfit', label: 'Street Synth', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'marine-armor', groupId: 'clothing', category: 'outfit', label: 'Marine-Panzer', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'lab-coat', groupId: 'clothing', category: 'outfit', label: 'Laborkittel', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'void-cloak', groupId: 'clothing', category: 'outfit', label: 'Void-Mantel', tags: ['sci-fi'], setting: 'sci-fi' }),
];

/** Species / head traits via ears (≥10). */
const SPECIES: readonly ContentPackAssetV1[] = [
  asset({ id: 'round', groupId: 'ears', category: 'species-trait', label: 'Runde Ohren', tags: ['human'], setting: 'neutral' }),
  asset({ id: 'elf-long', groupId: 'ears', category: 'species-trait', label: 'Elfenohren', tags: ['elf'], setting: 'fantasy' }),
  asset({ id: 'orc-pointed', groupId: 'ears', category: 'species-trait', label: 'Orkohren', tags: ['orc'], setting: 'fantasy' }),
  asset({ id: 'horns-small', groupId: 'ears', category: 'species-trait', label: 'Kleine Hörner', tags: ['demon'], setting: 'fantasy' }),
  asset({ id: 'horns-curved', groupId: 'ears', category: 'species-trait', label: 'Gebogene Hörner', tags: ['demon'], setting: 'fantasy' }),
  asset({ id: 'fins-side', groupId: 'ears', category: 'species-trait', label: 'Seitenflossen', tags: ['aquatic'], setting: 'fantasy' }),
  asset({ id: 'synthetic', groupId: 'ears', category: 'species-trait', label: 'Synth-Ohren', tags: ['cyborg'], setting: 'sci-fi' }),
  asset({ id: 'antennae', groupId: 'ears', category: 'species-trait', label: 'Antennen', tags: ['alien'], setting: 'sci-fi' }),
  asset({ id: 'ridge-crest', groupId: 'ears', category: 'species-trait', label: 'Kammrücken', tags: ['alien'], setting: 'sci-fi' }),
  asset({ id: 'none', groupId: 'ears', category: 'species-trait', label: 'Keine Ohren sichtbar', tags: ['minimal'], setting: 'neutral' }),
];

/** Accessories (≥12). */
const ACCESSORIES: readonly ContentPackAssetV1[] = [
  asset({ id: 'none', groupId: 'accessory', category: 'accessory', label: 'Keins', tags: ['none'], setting: 'neutral' }),
  asset({ id: 'earring', groupId: 'accessory', category: 'accessory', label: 'Ohrring', tags: ['jewelry'], setting: 'neutral' }),
  asset({ id: 'scar', groupId: 'accessory', category: 'accessory', label: 'Narbe', tags: ['marking'], setting: 'neutral' }),
  asset({ id: 'tiara', groupId: 'accessory', category: 'accessory', label: 'Diadem', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'eyepatch', groupId: 'accessory', category: 'accessory', label: 'Augenklappe', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'amulet', groupId: 'accessory', category: 'accessory', label: 'Amulett', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'goggles', groupId: 'accessory', category: 'accessory', label: 'Schutzbrille', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'ear-cuff-tech', groupId: 'accessory', category: 'accessory', label: 'Tech-Ohrclip', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'holo-pin', groupId: 'accessory', category: 'accessory', label: 'Holo-Pin', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'bandana', groupId: 'accessory', category: 'accessory', label: 'Bandana', tags: ['street'], setting: 'neutral' }),
  asset({ id: 'necklace-bone', groupId: 'accessory', category: 'accessory', label: 'Knochenkette', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'comm-badge', groupId: 'accessory', category: 'accessory', label: 'Comm-Badge', tags: ['sci-fi'], setting: 'sci-fi' }),
];

/** Cybernetic traits (≥8). */
const CYBER: readonly ContentPackAssetV1[] = [
  asset({ id: 'optic-implant', groupId: 'accessory', category: 'cybernetic', label: 'Optik-Implantat', tags: ['cyber'], setting: 'sci-fi' }),
  asset({ id: 'jaw-plate', groupId: 'accessory', category: 'cybernetic', label: 'Kieferplatte', tags: ['cyber'], setting: 'sci-fi' }),
  asset({ id: 'cranial-ports', groupId: 'accessory', category: 'cybernetic', label: 'Schädelports', tags: ['cyber'], setting: 'sci-fi' }),
  asset({ id: 'arm-servo-hint', groupId: 'accessory', category: 'cybernetic', label: 'Servo-Mark', tags: ['cyber'], setting: 'sci-fi' }),
  asset({ id: 'neural-lace', groupId: 'accessory', category: 'cybernetic', label: 'Neural Lace', tags: ['cyber'], setting: 'sci-fi' }),
  asset({ id: 'vocal-mod', groupId: 'accessory', category: 'cybernetic', label: 'Stimm-Mod', tags: ['cyber'], setting: 'sci-fi' }),
  asset({ id: 'dermal-chrome', groupId: 'accessory', category: 'cybernetic', label: 'Dermachrom', tags: ['cyber'], setting: 'sci-fi' }),
  asset({ id: 'hud-lens', groupId: 'accessory', category: 'cybernetic', label: 'HUD-Linse', tags: ['cyber'], setting: 'sci-fi' }),
];

/** Skin / marking options (≥ several). */
const MARKINGS: readonly ContentPackAssetV1[] = [
  asset({ id: 'mark-freckles', groupId: 'accessory', category: 'skin-marking', label: 'Sommersprossen', tags: ['skin'], setting: 'neutral' }),
  asset({ id: 'mark-tattoo-rune', groupId: 'accessory', category: 'skin-marking', label: 'Runentattoo', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'mark-warpaint', groupId: 'accessory', category: 'skin-marking', label: 'Kriegsbemalung', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'mark-scales', groupId: 'accessory', category: 'skin-marking', label: 'Schuppen', tags: ['fantasy'], setting: 'fantasy' }),
  asset({ id: 'mark-circuit', groupId: 'accessory', category: 'skin-marking', label: 'Schaltkreise', tags: ['sci-fi'], setting: 'sci-fi' }),
  asset({ id: 'mark-biolume', groupId: 'accessory', category: 'skin-marking', label: 'Biolumineszenz', tags: ['alien'], setting: 'sci-fi' }),
];

export const CONTENT_PACK_V1_ASSETS: readonly ContentPackAssetV1[] = [
  ...FACES,
  ...HAIR,
  ...FACIAL_HAIR,
  ...EYES,
  ...OUTFITS,
  ...SPECIES,
  ...ACCESSORIES,
  ...CYBER,
  ...MARKINGS,
];

export function listContentPackAssets(filter?: {
  groupId?: AvatarTraitGroupId;
  setting?: ContentPackSetting | 'all';
  category?: ContentPackCategory;
}): readonly ContentPackAssetV1[] {
  return CONTENT_PACK_V1_ASSETS.filter((asset) => {
    if (filter?.groupId && asset.groupId !== filter.groupId) return false;
    if (filter?.category && asset.category !== filter.category) return false;
    if (filter?.setting && filter.setting !== 'all' && asset.setting !== filter.setting && asset.setting !== 'neutral') {
      return false;
    }
    return true;
  });
}

export function getContentPackAsset(
  groupId: AvatarTraitGroupId,
  traitId: string,
): ContentPackAssetV1 | undefined {
  return CONTENT_PACK_V1_ASSETS.find(
    (asset) => asset.groupId === groupId && asset.id === traitId.trim(),
  );
}

export function countContentPackByCategory(): Readonly<Record<ContentPackCategory, number>> {
  const counts: Record<ContentPackCategory, number> = {
    face: 0,
    hair: 0,
    'facial-hair': 0,
    eyes: 0,
    outfit: 0,
    'species-trait': 0,
    accessory: 0,
    cybernetic: 0,
    'skin-marking': 0,
  };
  for (const asset of CONTENT_PACK_V1_ASSETS) {
    counts[asset.category] += 1;
  }
  return counts;
}

/** Minimums from issue #217 — used by checks. */
export const CONTENT_PACK_V1_MINIMUMS: Readonly<Record<ContentPackCategory, number>> = {
  face: 12,
  hair: 16,
  'facial-hair': 6,
  eyes: 8,
  outfit: 12,
  'species-trait': 10,
  accessory: 12,
  cybernetic: 8,
  'skin-marking': 6,
};

export function assertContentPackV1Minimums(): {
  ok: boolean;
  failures: readonly string[];
} {
  const counts = countContentPackByCategory();
  const failures: string[] = [];
  for (const [category, min] of Object.entries(CONTENT_PACK_V1_MINIMUMS) as [
    ContentPackCategory,
    number,
  ][]) {
    if (counts[category] < min) {
      failures.push(`${category}: ${counts[category]} < ${min}`);
    }
  }
  const fantasyOutfits = CONTENT_PACK_V1_ASSETS.filter(
    (a) => a.category === 'outfit' && a.setting === 'fantasy',
  ).length;
  const sciFiOutfits = CONTENT_PACK_V1_ASSETS.filter(
    (a) => a.category === 'outfit' && a.setting === 'sci-fi',
  ).length;
  if (fantasyOutfits < 6) failures.push(`fantasy outfits: ${fantasyOutfits} < 6`);
  if (sciFiOutfits < 6) failures.push(`sci-fi outfits: ${sciFiOutfits} < 6`);
  return { ok: failures.length === 0, failures };
}
