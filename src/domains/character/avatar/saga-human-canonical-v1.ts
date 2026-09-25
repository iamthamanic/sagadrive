/**
 * saga-human-canonical-v1 — catalog entry for the "Saga Human Canonical V1" PoC candidate.
 * Location: src/domains/character/avatar/saga-human-canonical-v1.ts
 *
 * One canonical human built offline from pinned CC0 MakeHuman data
 * (scripts/build-saga-human-canonical-v1.mjs). Comparison candidate next to SagaDrive Human and
 * the diagnostic Reference VRM — never a default, never persisted with a character.
 * Pure domain: allowlisted relative path + provenance + asset contracts. No React / Three / fetch.
 */

export const SAGA_HUMAN_CANONICAL_V1_ID = 'saga-human-canonical-v1' as const;

/** Local build output (gitignored binary; reproducible via npm run build:saga-human-canonical-v1). */
export const SAGA_HUMAN_CANONICAL_V1_PUBLIC_PATH =
  '/assets/avatars/canonical/saga-human-canonical-v1.vrm' as const;

/** First 12 hex of the built VRM sha256 — must equal build-report.json (checked in test-gate). */
export const SAGA_HUMAN_CANONICAL_V1_VRM_SHA256_PREFIX = '4628e5edca86' as const;

export interface SagaHumanCanonicalV1ProvenanceV1 {
  readonly sourcesManifest: string;
  readonly builderScript: string;
  readonly buildReport: string;
  readonly licenseSpdx: 'CC0-1.0';
  readonly dataOriginDe: string;
  readonly purpose: 'poc-candidate-liveact';
}

export const SAGA_HUMAN_CANONICAL_V1_PROVENANCE = {
  sourcesManifest: 'assets/species-3d/human-canonical-v1/sources.json',
  builderScript: 'scripts/build-saga-human-canonical-v1.mjs',
  buildReport: 'assets/species-3d/human-canonical-v1/build-report.json',
  licenseSpdx: 'CC0-1.0',
  dataOriginDe:
    'MakeHuman-Daten (Basismesh, Targets, Rig, Proxies; CC0) — nur Daten, kein MakeHuman-/MPFB-Code.',
  purpose: 'poc-candidate-liveact',
} as const satisfies SagaHumanCanonicalV1ProvenanceV1;

/** Asset contracts proven by the build's structural QA — the LiveAct runtime stays generic. */
export const SAGA_HUMAN_CANONICAL_V1_CONTRACTS = {
  /** Exactly one gaze owner: leftEye/rightEye via VRM LookAt (type bone); no eyeLook expressions. */
  gazeOwner: 'eye-bones-lookat',
  /** jaw* morphs move chin, lips, lower teeth and tongue together; the jaw joint is never driven. */
  jawOwner: 'morph',
  /** tongueOut: real tongue geometry in the asset; not a LiveAct tracking channel. */
  tongueOut: { assetCapability: true, liveActTracking: false },
} as const;

export function resolveSagaHumanCanonicalV1ModelUrl(): string {
  return `${SAGA_HUMAN_CANONICAL_V1_PUBLIC_PATH}?v=${SAGA_HUMAN_CANONICAL_V1_VRM_SHA256_PREFIX}`;
}
