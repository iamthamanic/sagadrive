/**
 * Look capability metadata — single registry for functional + reserved world domains (#346).
 * Location: src/domains/look/capability-metadata.ts
 *
 * Pure domain: Look Editor / docs must read availability from here — no parallel
 * hardcoded capability lists in UI.
 */

import {
  LOOK_FUNCTIONAL_CAPABILITIES,
  LOOK_RESERVED_CAPABILITIES,
  type LookCapability,
  type LookFunctionalCapability,
  type LookReservedCapability,
} from './types';
import { isLookCapability, isLookFunctionalCapability, isLookReservedCapability } from './parse';

/** Runtime support level for a known LookCapability. */
export type LookCapabilityAvailability = 'supported' | 'reserved';

export type LookCapabilityMeta = {
  readonly id: LookCapability;
  readonly availability: LookCapabilityAvailability;
  /** Short DE label for UI lists. */
  readonly labelDe: string;
  /** Longer DE description for editor / docs tooltips. */
  readonly descriptionDe: string;
  /**
   * When availability is `reserved`, UI must show this (or equivalent from
   * `lookCapabilityUnavailableLabel`) — never fake controls that write config.
   */
  readonly unavailableLabelDe: string | null;
};

const FUNCTIONAL_META: Record<LookFunctionalCapability, Omit<LookCapabilityMeta, 'id' | 'availability' | 'unavailableLabelDe'>> = {
  character: {
    labelDe: 'Charakter',
    descriptionDe: 'Visueller Stil für Spielercharaktere und Figuren.',
  },
  lighting: {
    labelDe: 'Beleuchtung',
    descriptionDe: 'Lichtstimmung und Belichtung des Looks.',
  },
  postFx: {
    labelDe: 'Post-FX',
    descriptionDe: 'Nachbearbeitung (Farbgrading, Filter) ohne World-Renderer.',
  },
};

const RESERVED_META: Record<
  LookReservedCapability,
  Omit<LookCapabilityMeta, 'id' | 'availability' | 'unavailableLabelDe'>
> = {
  environment: {
    labelDe: 'Umgebung',
    descriptionDe: 'Zukünftige World-Domain: allgemeine Umgebungsoptik.',
  },
  sky: {
    labelDe: 'Himmel',
    descriptionDe: 'Zukünftige World-Domain: Himmel / Atmosphäre.',
  },
  water: {
    labelDe: 'Wasser',
    descriptionDe: 'Zukünftige World-Domain: Wasserflächen und Reflexionen.',
  },
  vegetation: {
    labelDe: 'Vegetation',
    descriptionDe: 'Zukünftige World-Domain: Pflanzen und Bewuchs.',
  },
  terrain: {
    labelDe: 'Terrain',
    descriptionDe: 'Zukünftige World-Domain: Boden und Gelände.',
  },
  props: {
    labelDe: 'Props',
    descriptionDe: 'Zukünftige World-Domain: Platzhalter- und Set-Props.',
  },
  vfx: {
    labelDe: 'VFX',
    descriptionDe: 'Zukünftige World-Domain: partikel- und effektbasierte Optik.',
  },
};

export const LOOK_CAPABILITY_UNAVAILABLE_LABEL_DE = 'Noch nicht verfügbar';

/**
 * Canonical ordered metadata for every known LookCapability.
 * Length must equal LOOK_FUNCTIONAL + LOOK_RESERVED (enforced by contract check).
 */
export const LOOK_CAPABILITY_METADATA: readonly LookCapabilityMeta[] = [
  ...LOOK_FUNCTIONAL_CAPABILITIES.map(
    (id): LookCapabilityMeta => ({
      id,
      availability: 'supported',
      unavailableLabelDe: null,
      ...FUNCTIONAL_META[id],
    }),
  ),
  ...LOOK_RESERVED_CAPABILITIES.map(
    (id): LookCapabilityMeta => ({
      id,
      availability: 'reserved',
      unavailableLabelDe: LOOK_CAPABILITY_UNAVAILABLE_LABEL_DE,
      ...RESERVED_META[id],
    }),
  ),
];

const META_BY_ID: ReadonlyMap<LookCapability, LookCapabilityMeta> = new Map(
  LOOK_CAPABILITY_METADATA.map((meta) => [meta.id, meta]),
);

export function getLookCapabilityMeta(
  capability: LookCapability,
): LookCapabilityMeta {
  const meta = META_BY_ID.get(capability);
  if (!meta) {
    // Exhaustiveness guard — all LookCapability ids are registered above.
    throw new Error(`Missing LookCapability metadata for: ${capability}`);
  }
  return meta;
}

export function listLookCapabilityMetadata(): readonly LookCapabilityMeta[] {
  return LOOK_CAPABILITY_METADATA;
}

export function listReservedLookCapabilityMetadata(): readonly LookCapabilityMeta[] {
  return LOOK_CAPABILITY_METADATA.filter((m) => m.availability === 'reserved');
}

export function isLookCapabilitySupported(capability: LookCapability): boolean {
  return getLookCapabilityMeta(capability).availability === 'supported';
}

export function isLookCapabilityReserved(capability: LookCapability): boolean {
  return getLookCapabilityMeta(capability).availability === 'reserved';
}

/**
 * UI helper: label to show when a capability is not editable yet.
 * Unknown strings (forward-compat) also return the unavailable label.
 */
export function lookCapabilityUnavailableLabel(
  capability: string,
): string | null {
  if (!isLookCapability(capability)) {
    return LOOK_CAPABILITY_UNAVAILABLE_LABEL_DE;
  }
  const meta = getLookCapabilityMeta(capability);
  return meta.availability === 'reserved' ? meta.unavailableLabelDe : null;
}

/**
 * Classify a raw persisted capability token for forward-compatible reads.
 * Unknown tokens are kept as `unknown` (stripped from typed arrays by parse,
 * but UI/docs can still show unavailable).
 */
export function classifyLookCapabilityToken(
  value: string,
):
  | { readonly kind: 'supported'; readonly id: LookFunctionalCapability }
  | { readonly kind: 'reserved'; readonly id: LookReservedCapability }
  | { readonly kind: 'unknown'; readonly raw: string } {
  if (isLookFunctionalCapability(value)) {
    return { kind: 'supported', id: value };
  }
  if (isLookReservedCapability(value)) {
    return { kind: 'reserved', id: value };
  }
  return { kind: 'unknown', raw: value };
}

/** Exactly the seven future world domains — machine-readable list for docs/gates. */
export const LOOK_WORLD_RESERVED_CAPABILITY_IDS: readonly LookReservedCapability[] =
  LOOK_RESERVED_CAPABILITIES;
