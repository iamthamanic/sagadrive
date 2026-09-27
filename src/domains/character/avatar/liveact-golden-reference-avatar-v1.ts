/**
 * liveact-golden-reference-avatar-v1 — diagnostic Golden Reference VRM catalog entry.
 * Location: src/domains/character/avatar/liveact-golden-reference-avatar-v1.ts
 *
 * Single known-good external ARKit52 VRM for LiveAct A/B vs SagaDrive Human, plus the Human
 * mesh variant list (SagaDrive Human / Reference / Saga Human Canonical V1 candidate).
 * Pure domain: allowlisted relative path + provenance. No React / Three / fetch.
 */

import {
  resolveSagaHumanCanonicalV1ModelUrl,
  SAGA_HUMAN_CANONICAL_V1_ID,
} from './saga-human-canonical-v1';

export const LIVEACT_GOLDEN_REFERENCE_CONTRACT_VERSION =
  'SagaDriveLiveActGoldenReferenceAvatarV1' as const;

/** Stable product id for Human Vorlage select — never a default for new characters. */
export const LIVEACT_GOLDEN_REFERENCE_AVATAR_ID = 'reference-vrm-arkit52' as const;

export type LiveActHumanMeshVariantId =
  | 'sagadrive-human'
  | typeof LIVEACT_GOLDEN_REFERENCE_AVATAR_ID
  | typeof SAGA_HUMAN_CANONICAL_V1_ID;

/** Allowlisted public Vite path (binary via scripts/fetch-liveact-reference-vrm.mjs). */
export const LIVEACT_GOLDEN_REFERENCE_PUBLIC_PATH =
  '/assets/avatars/reference/valid-white-m1-default.vrm' as const;

/** Served file is a reproducible SagaDrive derivative of the pinned upstream original. */
export interface LiveActGoldenReferenceDerivativeV1 {
  readonly id: 'saga-teeth-binds-v1';
  readonly sha256: string;
  readonly transformScript: string;
  readonly changeDe: string;
}

export interface LiveActGoldenReferenceProvenanceV1 {
  readonly sourceRepository: string;
  readonly sourceCommit: string;
  readonly assetPath: string;
  /** Upstream Git LFS pointer oid — the unmodified original, cached in .cache/ by the fetch script. */
  readonly originalSha256: string;
  readonly licenseSpdx: 'CC-BY-4.0';
  readonly licenseUrl: string;
  readonly attributionDe: string;
  readonly purpose: 'diagnostic-liveact-reference';
  readonly derivative: LiveActGoldenReferenceDerivativeV1;
}

export const LIVEACT_GOLDEN_REFERENCE_PROVENANCE = {
  sourceRepository: 'https://github.com/TLTMedia/valid-vrm-avatars',
  sourceCommit: '3a79e95bc81655a3e1ec020538c67e7e17551b6f',
  assetPath: 'White/White_M_1_Default.vrm',
  originalSha256: '1ab7130c773bce62053c18599aea786ae6565604aeab4fcc9ef75c940830cff9',
  licenseSpdx: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attributionDe:
    'Google VALID (CC BY 4.0) — VRM 1.0 + ARKit52 conversion by TLTMedia. Diagnose-Avatar only.',
  purpose: 'diagnostic-liveact-reference',
  derivative: {
    id: 'saga-teeth-binds-v1',
    sha256: '323269ae9de3b13294135e6e2c3d84b52eb2c5d29d5a2ac9e1619f273be1645b',
    transformScript: 'scripts/lib/liveact-reference-vrm-teeth-binds.mjs',
    changeDe: 'Untere Zähne an jawOpen/jawLeft/jawRight/jawForward gebunden (Geometrie unverändert).',
  },
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
  return (
    value === 'sagadrive-human' ||
    value === LIVEACT_GOLDEN_REFERENCE_AVATAR_ID ||
    value === SAGA_HUMAN_CANONICAL_V1_ID
  );
}

export function resolveLiveActGoldenReferenceModelUrl(): string {
  return LIVEACT_GOLDEN_REFERENCE_PUBLIC_PATH;
}

/** Comparison mesh URL for a variant; null = SagaDrive Human (species template resolves it). */
export function resolveLiveActHumanMeshVariantModelUrl(id: LiveActHumanMeshVariantId): string | null {
  if (id === LIVEACT_GOLDEN_REFERENCE_AVATAR_ID) return resolveLiveActGoldenReferenceModelUrl();
  if (id === SAGA_HUMAN_CANONICAL_V1_ID) return resolveSagaHumanCanonicalV1ModelUrl();
  return null;
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
      hintDe: `Nur für LiveAct-Diagnose · abgeleitet vom Original (${LIVEACT_GOLDEN_REFERENCE_PROVENANCE.derivative.id}: Zähne folgen dem Kiefer)`,
    },
    {
      id: SAGA_HUMAN_CANONICAL_V1_ID,
      labelDe: 'Saga Human Canonical V1 (Kandidat)',
      hintDe:
        'PoC-Kandidat · MakeHuman-Daten (CC0) · echte Augen/Zähne/Zunge · lokal bauen: npm run build:saga-human-canonical-v1',
    },
  ];
}
