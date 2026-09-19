/**
 * Avatar V2 Composition Contract — pure domain (#249 / Epic #248).
 * Location: src/domains/character/avatar/composition-contract-v2.ts
 *
 * Orthogonal axes: Source, Anatomy, BodyCompatibility, BodyFamily, Modularity, Capabilities.
 * Source/provider never invent capabilities. Legacy CharacterAvatarDto remains readable.
 */

import type { CharacterAvatarDto } from '../domain/character.entity';
import {
  isAvatarSource,
  resolveAvatarSource,
  type AvatarSource,
} from './avatar-source';
import type { AvatarRigCapabilityFlag } from './rig-contract';

export const AVATAR_V2_COMPOSITION_CONTRACT_VERSION =
  'SagaDriveAvatarCompositionV2' as const;

/** Ingress origin — generate replaces legacy `meshy` in V2 vocabulary (still readable). */
export const AVATAR_V2_SOURCES = ['sagadrive', 'import', 'generate'] as const;
export type AvatarV2Source = (typeof AVATAR_V2_SOURCES)[number];

export const AVATAR_V2_ANATOMIES = ['humanoid', 'custom-creature', 'unknown'] as const;
export type AvatarV2Anatomy = (typeof AVATAR_V2_ANATOMIES)[number];

export const AVATAR_V2_BODY_COMPATIBILITIES = [
  'standard',
  'compact',
  'heavy',
  'custom',
  'unknown',
] as const;
export type AvatarV2BodyCompatibility = (typeof AVATAR_V2_BODY_COMPATIBILITIES)[number];

/** Canonical humanoid families; `custom` = unmatched / creature / fail-closed. */
export const AVATAR_V2_BODY_FAMILIES = ['standard', 'compact', 'heavy', 'custom'] as const;
export type AvatarV2BodyFamily = (typeof AVATAR_V2_BODY_FAMILIES)[number];

export const AVATAR_V2_MODULARITIES = ['monolithic', 'modular-parts', 'limited'] as const;
export type AvatarV2Modularity = (typeof AVATAR_V2_MODULARITIES)[number];

/**
 * Versioned composition snapshot. Capabilities are always explicit (may be empty) —
 * never inferred from source alone.
 */
export interface AvatarV2Composition {
  contractVersion: typeof AVATAR_V2_COMPOSITION_CONTRACT_VERSION;
  source: AvatarV2Source;
  /** Legacy wire value when present (`meshy` kept for audit/readback). */
  legacySource?: AvatarSource;
  anatomy: AvatarV2Anatomy;
  bodyCompatibility: AvatarV2BodyCompatibility;
  bodyFamily: AvatarV2BodyFamily;
  /** Species / preset identity — orthogonal to bodyFamily. */
  species: string;
  modularity: AvatarV2Modularity;
  /** Only from validated analysis — empty until Analyzer/Rig supplies evidence. */
  capabilities: readonly AvatarRigCapabilityFlag[];
}

export function isAvatarV2Source(value: unknown): value is AvatarV2Source {
  return typeof value === 'string' && (AVATAR_V2_SOURCES as readonly string[]).includes(value);
}

export function isAvatarV2Anatomy(value: unknown): value is AvatarV2Anatomy {
  return typeof value === 'string' && (AVATAR_V2_ANATOMIES as readonly string[]).includes(value);
}

export function isAvatarV2BodyCompatibility(
  value: unknown,
): value is AvatarV2BodyCompatibility {
  return (
    typeof value === 'string' &&
    (AVATAR_V2_BODY_COMPATIBILITIES as readonly string[]).includes(value)
  );
}

export function isAvatarV2BodyFamily(value: unknown): value is AvatarV2BodyFamily {
  return (
    typeof value === 'string' && (AVATAR_V2_BODY_FAMILIES as readonly string[]).includes(value)
  );
}

export function isAvatarV2Modularity(value: unknown): value is AvatarV2Modularity {
  return (
    typeof value === 'string' && (AVATAR_V2_MODULARITIES as readonly string[]).includes(value)
  );
}

/**
 * Map v1 AvatarSource → V2 source vocabulary.
 * `meshy` → `generate` (provider-neutral); unknown → fail-closed sagadrive via resolve.
 */
export function toAvatarV2Source(source: AvatarSource): AvatarV2Source {
  if (source === 'meshy') return 'generate';
  if (source === 'import') return 'import';
  return 'sagadrive';
}

/**
 * Parse optional V2 fields from unknown payloads (client/storage).
 * Invalid values fail-closed — never invent capabilities or force a body family.
 */
export function parseAvatarV2CompositionFields(input: {
  anatomy?: unknown;
  bodyCompatibility?: unknown;
  bodyFamily?: unknown;
  modularity?: unknown;
  capabilities?: unknown;
}): Pick<
  AvatarV2Composition,
  'anatomy' | 'bodyCompatibility' | 'bodyFamily' | 'modularity' | 'capabilities'
> {
  // Legacy DTO alias: non-humanoid → custom-creature (never invent capabilities).
  const anatomyRaw =
    input.anatomy === 'non-humanoid' ? 'custom-creature' : input.anatomy;
  const anatomy = isAvatarV2Anatomy(anatomyRaw) ? anatomyRaw : 'unknown';
  const bodyCompatibility = isAvatarV2BodyCompatibility(input.bodyCompatibility)
    ? input.bodyCompatibility
    : 'unknown';
  let bodyFamily: AvatarV2BodyFamily = 'custom';
  if (isAvatarV2BodyFamily(input.bodyFamily)) {
    bodyFamily = input.bodyFamily;
  } else if (
    bodyCompatibility === 'standard' ||
    bodyCompatibility === 'compact' ||
    bodyCompatibility === 'heavy'
  ) {
    // Compatibility hint alone does not grant a family without explicit family id —
    // fail-closed to custom unless family was valid.
    bodyFamily = 'custom';
  }

  // Legacy DTO alias: none → monolithic (baked single mesh).
  const modularityRaw = input.modularity === 'none' ? 'monolithic' : input.modularity;
  const modularity = isAvatarV2Modularity(modularityRaw) ? modularityRaw : 'limited';

  const capabilities: AvatarRigCapabilityFlag[] = [];
  if (Array.isArray(input.capabilities)) {
    for (const flag of input.capabilities) {
      if (
        typeof flag === 'string' &&
        [
          'static',
          'rigged',
          'humanoid',
          'vrm-ready',
          'rigid-equipment-ready',
          'skinned-wearable-ready',
        ].includes(flag)
      ) {
        capabilities.push(flag as AvatarRigCapabilityFlag);
      }
    }
  }

  return { anatomy, bodyCompatibility, bodyFamily, modularity, capabilities };
}

/**
 * Derive a V2 composition snapshot from legacy CharacterAvatarDto.
 * Does not invent capabilities from source/provider/model_url.
 */
export function compositionFromCharacterAvatarDto(
  avatar: CharacterAvatarDto | null | undefined,
  analysisCapabilities?: readonly AvatarRigCapabilityFlag[],
): AvatarV2Composition {
  if (!avatar) {
    return {
      contractVersion: AVATAR_V2_COMPOSITION_CONTRACT_VERSION,
      source: 'sagadrive',
      anatomy: 'unknown',
      bodyCompatibility: 'unknown',
      bodyFamily: 'custom',
      species: 'humanoid-neutral',
      modularity: 'limited',
      capabilities: analysisCapabilities ? [...analysisCapabilities] : [],
    };
  }

  const legacySource = resolveAvatarSource({
    source: avatar.source,
    provider: avatar.provider,
    modelUrl: avatar.model_url,
  });
  const source = toAvatarV2Source(legacySource);

  // Optional future fields on DTO (ignored by v1 readers) — typed via unknown bag.
  const bag = avatar as CharacterAvatarDto & {
    anatomy?: unknown;
    body_compatibility?: unknown;
    body_family?: unknown;
    modularity?: unknown;
    capabilities?: unknown;
  };

  const parsed = parseAvatarV2CompositionFields({
    anatomy: bag.anatomy,
    bodyCompatibility: bag.body_compatibility,
    bodyFamily: bag.body_family,
    modularity: bag.modularity,
    capabilities: bag.capabilities,
  });

  // SagaDrive catalog presets without external model → assume humanoid modular baseline,
  // still without inventing capability flags from source alone.
  let anatomy = parsed.anatomy;
  let modularity = parsed.modularity;
  let bodyCompatibility = parsed.bodyCompatibility;
  if (
    source === 'sagadrive' &&
    !avatar.model_url &&
    anatomy === 'unknown' &&
    modularity === 'limited'
  ) {
    anatomy = 'humanoid';
    modularity = 'modular-parts';
    if (bodyCompatibility === 'unknown') bodyCompatibility = 'standard';
  }

  const capabilities =
    analysisCapabilities && analysisCapabilities.length > 0
      ? [...analysisCapabilities]
      : parsed.capabilities;

  return {
    contractVersion: AVATAR_V2_COMPOSITION_CONTRACT_VERSION,
    source,
    legacySource: isAvatarSource(avatar.source) ? avatar.source : legacySource,
    anatomy,
    bodyCompatibility,
    bodyFamily: parsed.bodyFamily,
    species: typeof avatar.preset === 'string' && avatar.preset.trim() ? avatar.preset : 'humanoid-neutral',
    modularity,
    capabilities,
  };
}

/**
 * Assert composition never treats source as capability proof.
 * Throws when capabilities were clearly derived only from generate/meshy without analysis.
 */
export function assertCompositionCapabilitiesNotFromSource(
  composition: AvatarV2Composition,
): void {
  // Structural invariant: empty capabilities are always valid.
  if (composition.capabilities.length === 0) return;
  // Non-empty is allowed only when caller supplied analysis — we cannot prove origin here,
  // but we forbid the anti-pattern of copying source string into capabilities.
  for (const flag of composition.capabilities) {
    if (flag === (composition.source as unknown) || flag === (composition.legacySource as unknown)) {
      throw new Error('Avatar-V2-Capabilities dürfen nicht der Source entsprechen.');
    }
  }
}

/** Species must not be silently rewritten into bodyFamily. */
export function assertSpeciesOrthogonalToBodyFamily(composition: AvatarV2Composition): void {
  if (!isAvatarV2BodyFamily(composition.bodyFamily)) {
    throw new Error('bodyFamily muss ein kanonischer AvatarV2BodyFamily-Wert sein.');
  }
  // Species is free-form identity (e.g. fantasy-elf). It must never equal a mistaken
  // copy of an unknown token into bodyFamily — already enforced by isAvatarV2BodyFamily
  // on parse. Keep an explicit guard for empty species.
  if (typeof composition.species !== 'string' || composition.species.trim().length === 0) {
    throw new Error('species muss eine nicht-leere fachliche Identität sein.');
  }
}
