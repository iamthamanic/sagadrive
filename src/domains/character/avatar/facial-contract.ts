/**
 * Avatar facial expression contract — pure domain (no React / Three / VRM).
 * Location: src/domains/character/avatar/facial-contract.ts
 *
 * Canonical facial keys + VRM0/VRM1 aliases. Capabilities never invent shapes;
 * adapters report availability from the model, then weights clamp 0..1.
 */

export const FACIAL_CONTRACT_VERSION = 'SagaDriveAvatarFacialV1' as const;

export const FACIAL_EMOTION_KEYS = ['neutral', 'happy', 'angry', 'sad'] as const;
export type FacialEmotionKey = (typeof FACIAL_EMOTION_KEYS)[number];

export const FACIAL_VISEME_KEYS = ['aa', 'ih', 'ou', 'ee', 'oh'] as const;
export type FacialVisemeKey = (typeof FACIAL_VISEME_KEYS)[number];

export const FACIAL_BLINK_KEY = 'blink' as const;
export type FacialBlinkKey = typeof FACIAL_BLINK_KEY;

export type FacialCanonicalKey = FacialBlinkKey | FacialEmotionKey | FacialVisemeKey;

export const FACIAL_CANONICAL_KEYS: readonly FacialCanonicalKey[] = [
  FACIAL_BLINK_KEY,
  ...FACIAL_EMOTION_KEYS,
  ...FACIAL_VISEME_KEYS,
];

/**
 * Alias table: any of these VRM expression names map onto the canonical key.
 * First match wins when probing availability; setValue uses the resolved model name.
 */
export const FACIAL_VRM_ALIASES: Readonly<Record<FacialCanonicalKey, readonly string[]>> = {
  blink: ['blink', 'Blink', 'BLINK'],
  neutral: ['neutral', 'Neutral', 'NEUTRAL'],
  happy: ['happy', 'Happy', 'joy', 'Joy', 'A'],
  angry: ['angry', 'Angry', 'anger', 'Anger', 'B'],
  sad: ['sad', 'Sad', 'sorrow', 'Sorrow', 'C'],
  aa: ['aa', 'a', 'A', 'vrc.v_aa', 'mouthA'],
  ih: ['ih', 'i', 'I', 'vrc.v_ih', 'mouthI'],
  ou: ['ou', 'u', 'U', 'vrc.v_ou', 'mouthU'],
  ee: ['ee', 'e', 'E', 'vrc.v_e', 'mouthE'],
  oh: ['oh', 'o', 'O', 'vrc.v_oh', 'mouthO'],
};

export type FacialLayer = 'blink' | 'emotion' | 'viseme';

export function facialLayerForKey(key: FacialCanonicalKey): FacialLayer {
  if (key === 'blink') return 'blink';
  if ((FACIAL_VISEME_KEYS as readonly string[]).includes(key)) return 'viseme';
  return 'emotion';
}

export function clampFacialWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export interface FacialAvailability {
  contractVersion: typeof FACIAL_CONTRACT_VERSION;
  /** Canonical keys present on the loaded model (via alias resolution). */
  available: readonly FacialCanonicalKey[];
  /** Canonical → concrete VRM expression name used for setValue. */
  resolvedNames: Readonly<Partial<Record<FacialCanonicalKey, string>>>;
  /** Missing keys with short DE reason. */
  missingReasons: Readonly<Partial<Record<FacialCanonicalKey, string>>>;
}

/**
 * Build availability from the set of expression names present on a VRM (or empty for non-VRM).
 */
export function resolveFacialAvailability(
  presentExpressionNames: readonly string[],
): FacialAvailability {
  const present = new Set(presentExpressionNames);
  const available: FacialCanonicalKey[] = [];
  const resolvedNames: Partial<Record<FacialCanonicalKey, string>> = {};
  const missingReasons: Partial<Record<FacialCanonicalKey, string>> = {};

  for (const key of FACIAL_CANONICAL_KEYS) {
    const aliases = FACIAL_VRM_ALIASES[key];
    const match = aliases.find((alias) => present.has(alias));
    if (match) {
      available.push(key);
      resolvedNames[key] = match;
    } else {
      missingReasons[key] = `Expression „${key}“ fehlt am Modell.`;
    }
  }

  return {
    contractVersion: FACIAL_CONTRACT_VERSION,
    available,
    resolvedNames,
    missingReasons,
  };
}

/**
 * Conflict rules for layered facial state:
 * - Setting an emotion zeros other emotions (keeps blink + visemes).
 * - Setting a viseme zeros other visemes (keeps blink + emotion).
 * - Blink is independent.
 * - Neutral zeros emotions (and optionally visemes when resetAll).
 */
export function applyFacialLayerUpdate(
  current: Readonly<Partial<Record<FacialCanonicalKey, number>>>,
  key: FacialCanonicalKey,
  weight: number,
): Partial<Record<FacialCanonicalKey, number>> {
  const next: Partial<Record<FacialCanonicalKey, number>> = { ...current };
  const w = clampFacialWeight(weight);
  const layer = facialLayerForKey(key);

  if (layer === 'emotion') {
    for (const emotion of FACIAL_EMOTION_KEYS) {
      if (emotion !== key) next[emotion] = 0;
    }
  }
  if (layer === 'viseme') {
    for (const viseme of FACIAL_VISEME_KEYS) {
      if (viseme !== key) next[viseme] = 0;
    }
  }
  next[key] = w;
  return next;
}

export function createNeutralFacialWeights(): Partial<Record<FacialCanonicalKey, number>> {
  const weights: Partial<Record<FacialCanonicalKey, number>> = { blink: 0 };
  for (const emotion of FACIAL_EMOTION_KEYS) weights[emotion] = emotion === 'neutral' ? 1 : 0;
  for (const viseme of FACIAL_VISEME_KEYS) weights[viseme] = 0;
  return weights;
}

export function facialKeyLabelDe(key: FacialCanonicalKey): string {
  switch (key) {
    case 'blink':
      return 'Blink';
    case 'neutral':
      return 'Neutral';
    case 'happy':
      return 'Happy';
    case 'angry':
      return 'Angry';
    case 'sad':
      return 'Sad';
    case 'aa':
      return 'A';
    case 'ih':
      return 'I';
    case 'ou':
      return 'U';
    case 'ee':
      return 'E';
    case 'oh':
      return 'O';
    default:
      return key;
  }
}
