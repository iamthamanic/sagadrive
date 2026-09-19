/**
 * Avatar V2 Species Template Pack — pure domain (#256 / Epic #248).
 * Location: src/domains/character/avatar/species-template-pack-v1.ts
 *
 * Seven curated templates on canonical body families. Species ≠ topology;
 * Family mapping is default config, lore stays separate. Offline/self-hosted.
 */

import {
  BASE_BODY_SPECIES_PRESETS,
  deriveSpeciesMorphState,
  getBaseBodySpeciesPreset,
  type BaseBodySpeciesId,
  type BaseBodySpeciesPresetV1,
} from './base-body-contract';
import {
  CANONICAL_BODY_ASSET_IDS,
  type CanonicalBodyFamilyId,
} from './canonical-body-families-v1';
import type { AssetAuthoringProvenanceV1 } from './asset-authoring-contract-v1';
import type { SagaDriveAvatarMorphStateV1 } from './morph-contract';

export const SPECIES_TEMPLATE_PACK_CONTRACT_VERSION =
  'SagaDriveSpeciesTemplatePackV1' as const;

export const SPECIES_TEMPLATE_PACK_VERSION = '1.0.0' as const;

/** Default Family mapping (config, not lore). */
export const SPECIES_DEFAULT_BODY_FAMILY: Readonly<
  Record<BaseBodySpeciesId, CanonicalBodyFamilyId>
> = {
  human: 'standard',
  elf: 'standard',
  dwarf: 'compact',
  halfling: 'compact',
  orc: 'heavy',
  cyborg: 'standard',
  alien: 'standard',
};

export interface SpeciesTemplateV1 {
  contractVersion: typeof SPECIES_TEMPLATE_PACK_CONTRACT_VERSION;
  packVersion: typeof SPECIES_TEMPLATE_PACK_VERSION;
  speciesId: BaseBodySpeciesId;
  labelDe: string;
  bodyFamily: CanonicalBodyFamilyId;
  baseBodyAssetId: string;
  /** Existing species preset id (reused). */
  speciesPresetId: BaseBodySpeciesId;
  morphState: SagaDriveAvatarMorphStateV1;
  traits: BaseBodySpeciesPresetV1['traits'];
  goldenPreviewRef: string;
  provenance: AssetAuthoringProvenanceV1;
  /** Adult stylized look note — no chibi. */
  lookSummaryDe: string;
}

export function listSpeciesTemplateIds(): readonly BaseBodySpeciesId[] {
  return BASE_BODY_SPECIES_PRESETS.map((p) => p.id);
}

export function createSpeciesTemplateV1(speciesId: BaseBodySpeciesId): SpeciesTemplateV1 {
  const preset = getBaseBodySpeciesPreset(speciesId);
  const bodyFamily = SPECIES_DEFAULT_BODY_FAMILY[speciesId];
  const morphState = deriveSpeciesMorphState(speciesId);
  return {
    contractVersion: SPECIES_TEMPLATE_PACK_CONTRACT_VERSION,
    packVersion: SPECIES_TEMPLATE_PACK_VERSION,
    speciesId,
    labelDe: preset.labelDe,
    bodyFamily,
    baseBodyAssetId: CANONICAL_BODY_ASSET_IDS[bodyFamily],
    speciesPresetId: speciesId,
    morphState,
    traits: preset.traits,
    goldenPreviewRef: `fixtures/avatar-v2/golden/species-${speciesId}.json`,
    provenance: {
      license: 'first-party',
      attributionDe: `SagaDrive Species Template ${preset.labelDe}`,
    },
    lookSummaryDe: lookSummaryFor(speciesId),
  };
}

function lookSummaryFor(id: BaseBodySpeciesId): string {
  switch (id) {
    case 'human':
      return 'Erwachsener stilisierter Mensch, MToon, klare Silhouette.';
    case 'elf':
      return 'Schlanker Elf mit spitzen Ohren, adult stylized, keine Chibi-Proportionen.';
    case 'dwarf':
      return 'Kompakter Zwerg auf Compact-Family, kräftige Proportionen.';
    case 'halfling':
      return 'Halbling auf Compact-Family, freundlich aber adult stylized.';
    case 'orc':
      return 'Schwerer Ork auf Heavy-Family, markante Kieferlinie.';
    case 'cyborg':
      return 'Humanoider Cyborg mit Cyber-Traits, Standard-Family, kein Sonder-Skeleton.';
    case 'alien':
      return 'Humanoider Alien-Look auf Standard-Family; Lore getrennt von Topology.';
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function listSpeciesTemplatesV1(): readonly SpeciesTemplateV1[] {
  return listSpeciesTemplateIds().map(createSpeciesTemplateV1);
}

/** Picker DTO — no provider dependency. */
export interface SpeciesTemplatePickerItemV1 {
  speciesId: BaseBodySpeciesId;
  labelDe: string;
  bodyFamily: CanonicalBodyFamilyId;
  goldenPreviewRef: string;
  lookSummaryDe: string;
}

export function listSpeciesTemplatePickerItems(): readonly SpeciesTemplatePickerItemV1[] {
  return listSpeciesTemplatesV1().map((t) => ({
    speciesId: t.speciesId,
    labelDe: t.labelDe,
    bodyFamily: t.bodyFamily,
    goldenPreviewRef: t.goldenPreviewRef,
    lookSummaryDe: t.lookSummaryDe,
  }));
}

export function assertSpeciesTemplatePackComplete(
  templates: readonly SpeciesTemplateV1[] = listSpeciesTemplatesV1(),
): { ok: boolean; issues: readonly string[] } {
  const issues: string[] = [];
  const expected = new Set(listSpeciesTemplateIds());
  const seen = new Set<string>();
  for (const t of templates) {
    seen.add(t.speciesId);
    if (SPECIES_DEFAULT_BODY_FAMILY[t.speciesId] !== t.bodyFamily) {
      issues.push(`${t.speciesId}: unexpected body family ${t.bodyFamily}`);
    }
    if (t.baseBodyAssetId !== CANONICAL_BODY_ASSET_IDS[t.bodyFamily]) {
      issues.push(`${t.speciesId}: base body asset mismatch`);
    }
    if (!t.provenance.attributionDe.trim()) {
      issues.push(`${t.speciesId}: missing provenance`);
    }
    if (!t.goldenPreviewRef.includes(t.speciesId)) {
      issues.push(`${t.speciesId}: golden preview ref missing species id`);
    }
    if (!t.traits.head || !t.traits.clothing) {
      issues.push(`${t.speciesId}: incomplete traits`);
    }
  }
  for (const id of expected) {
    if (!seen.has(id)) issues.push(`missing template: ${id}`);
  }
  return { ok: issues.length === 0, issues };
}
