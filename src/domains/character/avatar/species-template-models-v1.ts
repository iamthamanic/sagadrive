/**
 * Species template preview models — allowlisted first-party GLB paths by species + gender.
 * Location: src/domains/character/avatar/species-template-models-v1.ts
 *
 * Pure domain: no React. Only fixed relative /assets paths (never free client URLs).
 * Divers / unset gender → no mesh. Missing species assets fail closed (undefined).
 *
 * Human active bases: quality-20260921 m5 (male) / f5 (female). No rollback picker.
 */
import type { CharacterGenderReading } from '../domain/character.entity';
import type { BaseBodySpeciesId } from './base-body-contract';
import { listSpeciesTemplateIds } from './species-template-pack-v1';

export const SPECIES_TEMPLATE_MODELS_CONTRACT_VERSION =
  'SagaDriveSpeciesTemplateModelsV1' as const;

/** Public Vite base for pilot species GLBs. */
export const SPECIES_TEMPLATE_MODEL_PUBLIC_BASE = '/assets/avatars/species' as const;

type GenderMeshKey = 'masculine-read' | 'feminine-read';

/** First-party pilot meshes — extend as more species are authored. */
const SPECIES_GENDER_MESH: Readonly<
  Partial<Record<BaseBodySpeciesId, Readonly<Record<GenderMeshKey, string>>>>
> = {
  human: {
    'masculine-read': `${SPECIES_TEMPLATE_MODEL_PUBLIC_BASE}/human-male-quality-20260921-m5.glb?v=quality5`,
    'feminine-read': `${SPECIES_TEMPLATE_MODEL_PUBLIC_BASE}/human-female-quality-20260921-f5.glb?v=quality5`,
  },
};

export function isBaseBodySpeciesId(value: string): value is BaseBodySpeciesId {
  return (listSpeciesTemplateIds() as readonly string[]).includes(value);
}

/**
 * Resolve allowlisted template preview model for sheet viewer.
 * Returns undefined when no mesh should load (divers, unset, missing asset).
 */
export function resolveSpeciesTemplateModelUrl(input: {
  speciesId: BaseBodySpeciesId | null;
  genderReading: CharacterGenderReading | undefined;
}): string | undefined {
  if (!input.speciesId) return undefined;
  if (!input.genderReading || input.genderReading === 'diverse') return undefined;

  const byGender = SPECIES_GENDER_MESH[input.speciesId];
  if (!byGender) return undefined;

  const path = byGender[input.genderReading];
  if (typeof path !== 'string' || !path.startsWith(`${SPECIES_TEMPLATE_MODEL_PUBLIC_BASE}/`)) {
    return undefined;
  }
  // Cache-bust (?v=…) must not fail the extension gate — strip query/hash like normalizeAvatarModelUrl.
  const pathWithoutQuery = path.replace(/[?#].*$/, '').toLowerCase();
  if (!pathWithoutQuery.endsWith('.glb') && !pathWithoutQuery.endsWith('.vrm')) return undefined;
  return path;
}

export function listSpeciesTemplateModelPaths(): readonly string[] {
  const paths: string[] = [];
  for (const speciesId of listSpeciesTemplateIds()) {
    const byGender = SPECIES_GENDER_MESH[speciesId];
    if (!byGender) continue;
    paths.push(byGender['masculine-read'], byGender['feminine-read']);
  }
  return paths;
}
