/**
 * Avatar source contract — sagadrive | import | meshy (#14).
 * Pure domain: source is never a capability proof; validated analysis owns capabilities.
 * Location: src/domains/character/avatar/avatar-source.ts
 */

export const AVATAR_SOURCE_CONTRACT_VERSION = 'SagaDriveAvatarSourceV1' as const;

export const AVATAR_SOURCES = ['sagadrive', 'import', 'meshy'] as const;
export type AvatarSource = (typeof AVATAR_SOURCES)[number];

/** Legacy appearance.avatar.provider — always map to sagadrive when reading. */
export const LEGACY_AVATAR_PROVIDER = 'm3-character-studio' as const;

export interface AvatarSourceOptionMeta {
  source: AvatarSource;
  titleDe: string;
  expectationDe: 'voll editierbar' | 'Import' | 'KI-generiert';
  summaryDe: string;
}

export const AVATAR_SOURCE_OPTIONS: readonly AvatarSourceOptionMeta[] = [
  {
    source: 'sagadrive',
    titleDe: 'Vorlage anpassen',
    expectationDe: 'voll editierbar',
    summaryDe:
      'Species-Vorlage wählen, Körperfamilie laden, Traits und Morph im gemeinsamen Editor.',
  },
  {
    source: 'import',
    titleDe: '3D-Modell importieren',
    expectationDe: 'Import',
    summaryDe:
      'Eigenes VRM/GLB hochladen, Analyse prüfen und Originalkörper behalten — Funktionen folgen der Analyse.',
  },
  {
    source: 'meshy',
    titleDe: 'Mit KI erstellen',
    expectationDe: 'KI-generiert',
    summaryDe:
      'Ziel wählen: Editierbar & kleidungsfähig oder Freie Form. Provider bleibt Technik; Fähigkeiten folgen der Analyse.',
  },
] as const;

export function isAvatarSource(value: unknown): value is AvatarSource {
  return typeof value === 'string' && (AVATAR_SOURCES as readonly string[]).includes(value);
}

/**
 * Resolve persisted source. Legacy `provider: m3-character-studio` → sagadrive.
 * Missing source with model_url but no traits hint → import (deterministic fallback).
 */
export function resolveAvatarSource(input: {
  source?: unknown;
  provider?: unknown;
  modelUrl?: string | null;
}): AvatarSource {
  if (isAvatarSource(input.source)) return input.source;
  if (input.provider === LEGACY_AVATAR_PROVIDER) return 'sagadrive';
  if (typeof input.modelUrl === 'string' && input.modelUrl.trim().length > 0) {
    return 'import';
  }
  return 'sagadrive';
}

export function avatarSourceMeta(source: AvatarSource): AvatarSourceOptionMeta {
  const found = AVATAR_SOURCE_OPTIONS.find((option) => option.source === source);
  if (!found) {
    return AVATAR_SOURCE_OPTIONS[0];
  }
  return found;
}

/** Human-readable capability summary — never invents flags from source alone. */
export function describeAvatarSourceCapabilities(input: {
  source: AvatarSource;
  morphBody?: boolean;
  morphFace?: boolean;
  animation?: boolean;
  facial?: boolean;
  wearables?: boolean;
}): string {
  const parts: string[] = [];
  if (input.morphBody || input.morphFace) {
    const body = input.morphBody ? 'Körper' : null;
    const face = input.morphFace ? 'Gesicht' : null;
    parts.push([body, face].filter(Boolean).join('/') + ' editierbar');
  } else {
    parts.push('Körper/Gesicht nicht morphbar');
  }
  parts.push(input.animation ? 'Animation möglich' : 'keine Animation');
  parts.push(input.facial ? 'Facial möglich' : 'kein Facial');
  parts.push(input.wearables ? 'Wearables möglich' : 'starres Equipment');
  void input.source;
  return parts.join(' · ');
}

export interface AvatarSourceSwitchDecision {
  needsConfirm: boolean;
  messageDe?: string;
}

/**
 * Dirty SagaDrive morph/traits → Import/Meshy needs explicit discard confirm.
 * Source never grants permissions.
 */
export function evaluateAvatarSourceSwitch(input: {
  from: AvatarSource;
  to: AvatarSource;
  dirtySagaDrive: boolean;
}): AvatarSourceSwitchDecision {
  if (input.from === input.to) return { needsConfirm: false };
  if (input.from === 'sagadrive' && input.dirtySagaDrive && input.to !== 'sagadrive') {
    return {
      needsConfirm: true,
      messageDe:
        'Ungespeicherte SagaDrive-Look-Änderungen verwerfen und Quelle wechseln?',
    };
  }
  return { needsConfirm: false };
}
