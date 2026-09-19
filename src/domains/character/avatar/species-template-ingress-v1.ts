/**
 * Species Template Ingress V1 — apply curated template into editor seed (#260).
 * Location: src/domains/character/avatar/species-template-ingress-v1.ts
 *
 * Pure domain: maps species template → morph/traits/body family/basic outfit.
 * UI must not hardcode species→family; callers use this seed only.
 */

import type { AvatarEquipmentVisual } from './equipment-visual-contract';
import type { CanonicalBodyFamilyId } from './canonical-body-families-v1';
import type { BaseBodySpeciesId } from './base-body-contract';
import { getBaseBodySpeciesPreset } from './base-body-contract';
import type { SagaDriveAvatarMorphStateV1 } from './morph-contract';
import {
  createSpeciesTemplateV1,
  listSpeciesTemplateIds,
  listSpeciesTemplatePickerItems,
  type SpeciesTemplatePickerItemV1,
} from './species-template-pack-v1';
import {
  isStarterWearableId,
  resolveStarterWearableFit,
  type StarterWearableId,
} from './starter-wardrobe-manifest-v1';

export const SPECIES_TEMPLATE_INGRESS_CONTRACT_VERSION =
  'SagaDriveSpeciesTemplateIngressV1' as const;

/** Default basic outfit for „Vorlage anpassen“ — underwear + shirt/pants/boots. */
export const DEFAULT_TEMPLATE_BASIC_OUTFIT_IDS: readonly StarterWearableId[] = [
  'underwear',
  'basic-shirt',
  'basic-pants',
  'basic-boots',
] as const;

export function speciesTemplatePersistenceId(speciesId: BaseBodySpeciesId): string {
  return `species-template:${speciesId}`;
}

export function parseSpeciesTemplatePersistenceId(
  value: unknown,
): BaseBodySpeciesId | null {
  if (typeof value !== 'string' || !value.startsWith('species-template:')) return null;
  const id = value.slice('species-template:'.length);
  return (listSpeciesTemplateIds() as readonly string[]).includes(id)
    ? (id as BaseBodySpeciesId)
    : null;
}

export interface SpeciesTemplateEditorSeedV1 {
  contractVersion: typeof SPECIES_TEMPLATE_INGRESS_CONTRACT_VERSION;
  speciesId: BaseBodySpeciesId;
  templateId: string;
  labelDe: string;
  bodyFamily: CanonicalBodyFamilyId;
  baseBodyAssetId: string;
  morphState: SagaDriveAvatarMorphStateV1;
  traits: Readonly<{
    head: string;
    ears: string;
    hair: string;
    clothing: string;
    accessory?: string;
  }>;
  colors: Readonly<{ hair: string; skin: string; eyes?: string }>;
  /** Ready wardrobe ids only — missing fits are omitted + warned. */
  starterWardrobeIds: readonly StarterWearableId[];
  warningsDe: readonly string[];
}

/**
 * Apply a species template into an editor seed.
 * Body family always comes from the template pack config — never from UI branching.
 */
export function applySpeciesTemplateIngress(
  speciesId: BaseBodySpeciesId,
): SpeciesTemplateEditorSeedV1 {
  const template = createSpeciesTemplateV1(speciesId);
  const preset = getBaseBodySpeciesPreset(speciesId);
  const overlayColors = preset.morphOverlay.colors ?? {};
  const morphColors = template.morphState.colors;
  const warningsDe: string[] = [];
  const starterWardrobeIds: StarterWearableId[] = [];

  for (const wearableId of DEFAULT_TEMPLATE_BASIC_OUTFIT_IDS) {
    const fit = resolveStarterWearableFit({
      wearableId,
      bodyFamily: template.bodyFamily,
      morph: template.morphState,
    });
    if (fit.status === 'ready') {
      starterWardrobeIds.push(wearableId);
      continue;
    }
    warningsDe.push(
      fit.messageDe ??
        `${wearableId} passt nicht zur Body Family ${template.bodyFamily} — nicht still gerendert.`,
    );
  }

  return {
    contractVersion: SPECIES_TEMPLATE_INGRESS_CONTRACT_VERSION,
    speciesId,
    templateId: speciesTemplatePersistenceId(speciesId),
    labelDe: template.labelDe,
    bodyFamily: template.bodyFamily,
    baseBodyAssetId: template.baseBodyAssetId,
    morphState: template.morphState,
    traits: {
      head: template.traits.head,
      ears: template.traits.ears,
      hair: template.traits.hair,
      clothing: template.traits.clothing,
      ...(template.traits.accessory ? { accessory: template.traits.accessory } : {}),
    },
    colors: {
      hair: overlayColors.hair ?? morphColors.hair,
      skin: overlayColors.skin ?? morphColors.skin,
      ...(overlayColors.eyes || morphColors.eyes
        ? { eyes: overlayColors.eyes ?? morphColors.eyes }
        : {}),
    },
    starterWardrobeIds,
    warningsDe,
  };
}

/** Project ready basic-outfit visuals for skinned wearable plan/runtime. */
export function projectTemplateBasicOutfitVisuals(input: {
  seed: SpeciesTemplateEditorSeedV1;
}): readonly AvatarEquipmentVisual[] {
  const visuals: AvatarEquipmentVisual[] = [];
  for (const wearableId of input.seed.starterWardrobeIds) {
    if (!isStarterWearableId(wearableId)) continue;
    const fit = resolveStarterWearableFit({
      wearableId,
      bodyFamily: input.seed.bodyFamily,
      morph: input.seed.morphState,
    });
    if (fit.status !== 'ready' || !fit.variant) {
      continue;
    }
    visuals.push({
      instanceId: `template-outfit:${input.seed.speciesId}:${wearableId}`,
      definitionId: `starter-wardrobe:${wearableId}`,
      bindingId: null,
      assetKey: `wearable:${wearableId}`,
      attachment: 'skinned',
      anchor: null,
      slots: ['special'],
      primarySlot: 'special',
      transform: null,
      hideRegions: [...fit.hideRule.hideRegions],
      status: 'ready',
      fitStatus: 'ready',
      reasonDe: `${fit.variant.familyId}-Fit bereit.`,
    });
  }
  return visuals;
}

/** Picker items for UI — thin re-export so app never imports pack internals for mapping. */
export function listTemplateCreatorPickerItems(): readonly SpeciesTemplatePickerItemV1[] {
  return listSpeciesTemplatePickerItems();
}

export function assertTemplateCreatorFlowInvariants(input: {
  seeds?: readonly SpeciesTemplateEditorSeedV1[];
}): { ok: boolean; issues: readonly string[] } {
  const issues: string[] = [];
  const seeds =
    input.seeds ??
    listSpeciesTemplateIds().map((id) => applySpeciesTemplateIngress(id));

  if (seeds.length !== 7) {
    issues.push(`expected 7 seeds, got ${seeds.length}`);
  }

  for (const seed of seeds) {
    if (seed.templateId !== speciesTemplatePersistenceId(seed.speciesId)) {
      issues.push(`${seed.speciesId}: templateId mismatch`);
    }
    if (seed.bodyFamily !== createSpeciesTemplateV1(seed.speciesId).bodyFamily) {
      issues.push(`${seed.speciesId}: bodyFamily drifted from template pack`);
    }
    if (seed.starterWardrobeIds.length === 0) {
      issues.push(`${seed.speciesId}: empty basic outfit`);
    }
    for (const id of seed.starterWardrobeIds) {
      if (!DEFAULT_TEMPLATE_BASIC_OUTFIT_IDS.includes(id)) {
        issues.push(`${seed.speciesId}: unexpected wardrobe id ${id}`);
      }
    }
    const visuals = projectTemplateBasicOutfitVisuals({ seed });
    if (visuals.length !== seed.starterWardrobeIds.length) {
      issues.push(`${seed.speciesId}: visual projection count mismatch`);
    }
  }

  // Explicit family expectations from acceptance (domain config, not UI).
  const byId = new Map(seeds.map((s) => [s.speciesId, s]));
  const expectFamily: Record<string, CanonicalBodyFamilyId> = {
    dwarf: 'compact',
    halfling: 'compact',
    orc: 'heavy',
    human: 'standard',
    elf: 'standard',
    cyborg: 'standard',
    alien: 'standard',
  };
  for (const [id, family] of Object.entries(expectFamily)) {
    const seed = byId.get(id as BaseBodySpeciesId);
    if (!seed) {
      issues.push(`missing seed ${id}`);
      continue;
    }
    if (seed.bodyFamily !== family) {
      issues.push(`${id}: expected family ${family}, got ${seed.bodyFamily}`);
    }
  }

  return { ok: issues.length === 0, issues };
}
