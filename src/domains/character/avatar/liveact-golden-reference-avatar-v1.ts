/**
 * liveact-golden-reference-avatar-v1 — diagnostic Golden Reference VRM catalog entry.
 * Location: src/domains/character/avatar/liveact-golden-reference-avatar-v1.ts
 *
 * Single known-good external ARKit52 VRM for LiveAct A/B vs SagaDrive Human.
 * Pure domain: allowlisted relative path + provenance. No React / Three / fetch.
 */

export const LIVEACT_GOLDEN_REFERENCE_CONTRACT_VERSION =
  'SagaDriveLiveActGoldenReferenceAvatarV1' as const;

/** Stable product id for Human Vorlage select — never a default for new characters. */
export const LIVEACT_GOLDEN_REFERENCE_AVATAR_ID = 'reference-vrm-arkit52' as const;

export type LiveActHumanMeshVariantId =
  | 'sagadrive-human'
  | typeof LIVEACT_GOLDEN_REFERENCE_AVATAR_ID;

/** Allowlisted public Vite path (binary via scripts/fetch-liveact-reference-vrm.mjs). */
export const LIVEACT_GOLDEN_REFERENCE_PUBLIC_PATH =
  '/assets/avatars/reference/valid-white-m1-default.vrm' as const;

export interface LiveActGoldenReferenceProvenanceV1 {
  readonly sourceRepository: string;
  readonly sourceCommit: string;
  readonly assetPath: string;
  readonly licenseSpdx: 'CC-BY-4.0';
  readonly licenseUrl: string;
  readonly attributionDe: string;
  readonly purpose: 'diagnostic-liveact-reference';
}

export const LIVEACT_GOLDEN_REFERENCE_PROVENANCE = {
  sourceRepository: 'https://github.com/TLTMedia/valid-vrm-avatars',
  sourceCommit: '3a79e95bc81655a3e1ec020538c67e7e17551b6f',
  assetPath: 'White/White_M_1_Default.vrm',
  licenseSpdx: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attributionDe:
    'Google VALID (CC BY 4.0) — VRM 1.0 + ARKit52 conversion by TLTMedia. Diagnose-Avatar only.',
  purpose: 'diagnostic-liveact-reference',
} as const satisfies LiveActGoldenReferenceProvenanceV1;

/** Channels expected on the pinned Reference VRM (expressions), for deterministic checks. */
export const LIVEACT_GOLDEN_REFERENCE_EXPECTED_CHANNELS = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
  'browInnerUp',
] as const;

export function isLiveActHumanMeshVariantId(value: string): value is LiveActHumanMeshVariantId {
  return value === 'sagadrive-human' || value === LIVEACT_GOLDEN_REFERENCE_AVATAR_ID;
}

export function resolveLiveActGoldenReferenceModelUrl(): string {
  return LIVEACT_GOLDEN_REFERENCE_PUBLIC_PATH;
}

export function listLiveActHumanMeshVariantOptions(): readonly {
  id: LiveActHumanMeshVariantId;
  labelDe: string;
  hintDe?: string;
}[] {
  return [
    { id: 'sagadrive-human', labelDe: 'SagaDrive Human' },
    {
      id: LIVEACT_GOLDEN_REFERENCE_AVATAR_ID,
      labelDe: 'Reference VRM (ARKit52)',
      hintDe: 'Nur für LiveAct-Diagnose',
    },
  ];
}
