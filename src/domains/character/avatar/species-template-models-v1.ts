/**
 * Species template preview models — allowlisted first-party mesh paths by species + gender.
 * Location: src/domains/character/avatar/species-template-models-v1.ts
 *
 * Pure domain: no React. Only fixed relative /assets paths (never free client URLs).
 * Divers / unset gender → no mesh. Missing species assets fail closed (undefined).
 *
 * Dual quality (#perf-speed):
 * - preview: light editor LOD under species/ (≤~10 MB) — default critical path; committed for CI/prod
 * - fidelity: face3 HQ VRM — persist / LiveAct face work / explicit HQ
 *
 * Human fidelity bases: quality-20260921 m5/f5 face3 current-HEAD reauthor VRM 1.0 (#423).
 * Generic GLB remains published as fallback/source; no rollback picker.
 */
import type { CharacterGenderReading } from '../domain/character.entity';
import type { BaseBodySpeciesId } from './base-body-contract';
import { listSpeciesTemplateIds } from './species-template-pack-v1';

export const SPECIES_TEMPLATE_MODELS_CONTRACT_VERSION =
  'SagaDriveSpeciesTemplateModelsV1' as const;

/** Public Vite base for pilot species meshes (VRM primary / GLB fallback). */
export const SPECIES_TEMPLATE_MODEL_PUBLIC_BASE = '/assets/avatars/species' as const;

export type SpeciesTemplateMeshQuality = 'preview' | 'fidelity';

type GenderMeshKey = 'masculine-read' | 'feminine-read';

/** HQ / fidelity Human meshes — persist + LiveAct face fidelity. */
const SPECIES_GENDER_MESH_FIDELITY: Readonly<
  Partial<Record<BaseBodySpeciesId, Readonly<Record<GenderMeshKey, string>>>>
> = {
  human: {
    'masculine-read': `${SPECIES_TEMPLATE_MODEL_PUBLIC_BASE}/human-male-quality-20260921-m5-face3.vrm?v=quality5-face3-repro1`,
    'feminine-read': `${SPECIES_TEMPLATE_MODEL_PUBLIC_BASE}/human-female-quality-20260921-f5-face3.vrm?v=quality5-face3-repro1`,
  },
};

/**
 * Light editor preview — shared LOD for m/w until per-gender LODs exist.
 * Published under species/ (committed) — not the gitignored canonical PoC path.
 * Bytes ~9.8 MB vs 28–34 MB face3.
 */
const SPECIES_GENDER_MESH_PREVIEW: Readonly<
  Partial<Record<BaseBodySpeciesId, Readonly<Record<GenderMeshKey, string>>>>
> = {
  human: {
    'masculine-read': `${SPECIES_TEMPLATE_MODEL_PUBLIC_BASE}/human-preview-lod-v1.vrm?v=preview-lod1`,
    'feminine-read': `${SPECIES_TEMPLATE_MODEL_PUBLIC_BASE}/human-preview-lod-v1.vrm?v=preview-lod1`,
  },
};

export function isBaseBodySpeciesId(value: string): value is BaseBodySpeciesId {
  return (listSpeciesTemplateIds() as readonly string[]).includes(value);
}

function resolveFromCatalog(
  catalog: Readonly<
    Partial<Record<BaseBodySpeciesId, Readonly<Record<GenderMeshKey, string>>>>
  >,
  input: {
    speciesId: BaseBodySpeciesId | null;
    genderReading: CharacterGenderReading | undefined;
  },
): string | undefined {
  if (!input.speciesId) return undefined;
  if (!input.genderReading || input.genderReading === 'diverse') return undefined;

  const byGender = catalog[input.speciesId];
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

/**
 * Resolve allowlisted template model for sheet viewer / persist.
 * Default quality is `preview` (editor critical path). Use `fidelity` for save / LiveAct HQ.
 * Returns undefined when no mesh should load (divers, unset, missing asset).
 */
export function resolveSpeciesTemplateModelUrl(input: {
  speciesId: BaseBodySpeciesId | null;
  genderReading: CharacterGenderReading | undefined;
  quality?: SpeciesTemplateMeshQuality;
}): string | undefined {
  const quality = input.quality ?? 'preview';
  const catalog =
    quality === 'fidelity' ? SPECIES_GENDER_MESH_FIDELITY : SPECIES_GENDER_MESH_PREVIEW;
  return resolveFromCatalog(catalog, input);
}

/** All allowlisted template paths (preview + fidelity) for QA / asset gates. */
export function listSpeciesTemplateModelPaths(): readonly string[] {
  const paths: string[] = [];
  for (const speciesId of listSpeciesTemplateIds()) {
    const fidelity = SPECIES_GENDER_MESH_FIDELITY[speciesId];
    const preview = SPECIES_GENDER_MESH_PREVIEW[speciesId];
    if (fidelity) {
      paths.push(fidelity['masculine-read'], fidelity['feminine-read']);
    }
    if (preview) {
      paths.push(preview['masculine-read'], preview['feminine-read']);
    }
  }
  return paths;
}
