/**
 * Avatar V2 Final Acceptance Golden Matrix — pure domain (#270 / Epic #248).
 * Location: src/domains/character/avatar/final-acceptance-matrix-v1.ts
 *
 * Enumerates closed V2 user-journey classes and required check hooks.
 * No new product features — closeout only. No React / network.
 */

export const AVATAR_V2_FINAL_ACCEPTANCE_VERSION =
  'SagaDriveAvatarV2FinalAcceptanceV1' as const;

export const AVATAR_V2_GOLDEN_JOURNEY_IDS = [
  'native-human',
  'native-elf',
  'native-dwarf',
  'native-orc',
  'native-cyborg',
  'import-humanoid',
  'import-dwarf-like',
  'import-baked-glb',
  'import-modular-glb',
  'import-invalid-glb',
  'generate-editable-humanoid',
  'generate-free-form-gumo',
  'custom-faruk-original',
  'convert-to-family',
  'shared-surface-reload',
] as const;
export type AvatarV2GoldenJourneyId = (typeof AVATAR_V2_GOLDEN_JOURNEY_IDS)[number];

export type AvatarV2JourneyKind =
  | 'native'
  | 'import'
  | 'generate'
  | 'custom'
  | 'convert'
  | 'shared'
  | 'invalid';

export interface AvatarV2GoldenJourneyV1 {
  journeyId: AvatarV2GoldenJourneyId;
  kind: AvatarV2JourneyKind;
  labelDe: string;
  /** Fixture path or logical fixture id — never private user assets. */
  fixtureRef: string;
  /** Feature check scripts that must pass for this journey. */
  requiredChecks: readonly string[];
  expectedOutcome: 'ready' | 'limited' | 'failed' | 'degraded-free-form';
  notesDe: string;
}

export interface AvatarV2SecurityCaseV1 {
  caseId: string;
  labelDe: string;
  expect: 'deny' | 'fail-closed' | 'strip';
  notesDe: string;
}

export interface AvatarV2PerfBudgetV1 {
  metricId: string;
  labelDe: string;
  /** Soft CI budget — informational unless exceeded dramatically. */
  budgetMs: number;
  notesDe: string;
}

/** Closed golden matrix — all V2 classes from Epic #248 / #270. */
export const AVATAR_V2_GOLDEN_MATRIX_V1: readonly AvatarV2GoldenJourneyV1[] = [
  {
    journeyId: 'native-human',
    kind: 'native',
    labelDe: 'Native Human Template',
    fixtureRef: 'fixtures/avatar-v2/golden/species-human.json',
    requiredChecks: ['avatar-v2-species-template-pack-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'Species pack + starter wardrobe.',
  },
  {
    journeyId: 'native-elf',
    kind: 'native',
    labelDe: 'Native Elf Template',
    fixtureRef: 'fixtures/avatar-v2/golden/species-elf.json',
    requiredChecks: ['avatar-v2-species-template-pack-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'Standard family morph/traits.',
  },
  {
    journeyId: 'native-dwarf',
    kind: 'native',
    labelDe: 'Native Dwarf Template',
    fixtureRef: 'fixtures/avatar-v2/golden/species-dwarf.json',
    requiredChecks: ['avatar-v2-species-template-pack-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'Compact family.',
  },
  {
    journeyId: 'native-orc',
    kind: 'native',
    labelDe: 'Native Orc Template',
    fixtureRef: 'fixtures/avatar-v2/golden/species-orc.json',
    requiredChecks: ['avatar-v2-species-template-pack-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'Heavy family.',
  },
  {
    journeyId: 'native-cyborg',
    kind: 'native',
    labelDe: 'Native Cyborg Template',
    fixtureRef: 'fixtures/avatar-v2/golden/species-cyborg.json',
    requiredChecks: ['avatar-v2-species-template-pack-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'Sci-Fi species pack.',
  },
  {
    journeyId: 'import-humanoid',
    kind: 'import',
    labelDe: 'Import Humanoid Original',
    fixtureRef: 'fixtures/avatar-v2/structure-humanoid-plain.json',
    requiredChecks: ['avatar-v2-import-original-flow-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'Import → Analyze → Original behalten.',
  },
  {
    journeyId: 'import-dwarf-like',
    kind: 'import',
    labelDe: 'Import Dwarf-like',
    fixtureRef: 'fixtures/avatar-v2/golden/rig-profile-dwarf.json',
    requiredChecks: [
      'avatar-v2-import-original-flow-check.mjs',
      'avatar-v2-custom-creature-contract-check.mjs',
    ],
    expectedOutcome: 'ready',
    notesDe: 'Family hint compact möglich.',
  },
  {
    journeyId: 'import-baked-glb',
    kind: 'import',
    labelDe: 'Import baked GLB',
    fixtureRef: 'fixtures/avatar-v2/structure-baked.json',
    requiredChecks: ['avatar-v2-structure-analyzer-check.mjs'],
    expectedOutcome: 'limited',
    notesDe: 'Monolithic / limited modularity.',
  },
  {
    journeyId: 'import-modular-glb',
    kind: 'import',
    labelDe: 'Import modular GLB v1',
    fixtureRef: 'fixtures/avatar-v2/modular-glb-v1.valid.json',
    requiredChecks: ['avatar-v2-modular-glb-contract-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'extras.sagadrive annotated.',
  },
  {
    journeyId: 'import-invalid-glb',
    kind: 'invalid',
    labelDe: 'Import invalid GLB metadata',
    fixtureRef: 'fixtures/avatar-v2/modular-glb-v1.invalid-version.json',
    requiredChecks: ['avatar-v2-modular-glb-contract-check.mjs'],
    expectedOutcome: 'failed',
    notesDe: 'Fail-closed; previous avatar untouched.',
  },
  {
    journeyId: 'generate-editable-humanoid',
    kind: 'generate',
    labelDe: 'Generate Editierbar',
    fixtureRef: 'domain:modular-generate-flow/human',
    requiredChecks: [
      'avatar-v2-generate-ux-check.mjs',
      'avatar-v2-modular-generate-flow-check.mjs',
    ],
    expectedOutcome: 'ready',
    notesDe: '#267+#269 pipeline.',
  },
  {
    journeyId: 'generate-free-form-gumo',
    kind: 'generate',
    labelDe: 'Generate Freie Form / Gumo',
    fixtureRef: 'domain:modular-generate-flow/gumo-like',
    requiredChecks: [
      'avatar-v2-generate-ux-check.mjs',
      'avatar-v2-modular-generate-flow-check.mjs',
    ],
    expectedOutcome: 'degraded-free-form',
    notesDe: 'Unusual anatomy → free-form.',
  },
  {
    journeyId: 'custom-faruk-original',
    kind: 'custom',
    labelDe: 'Custom Faruk Original behalten',
    fixtureRef: 'fixtures/avatar-v2/golden/rig-profile-faruk-like.json',
    requiredChecks: [
      'avatar-v2-custom-creature-flow-check.mjs',
      'avatar-v2-custom-creature-contract-check.mjs',
    ],
    expectedOutcome: 'ready',
    notesDe: '#266 vertical slice.',
  },
  {
    journeyId: 'convert-to-family',
    kind: 'convert',
    labelDe: 'Conversion Standard/Compact/Heavy',
    fixtureRef: 'domain:body-conversion-flow',
    requiredChecks: [
      'avatar-v2-body-conversion-flow-check.mjs',
      'avatar-v2-identity-transfer-spike-check.mjs',
    ],
    expectedOutcome: 'ready',
    notesDe: 'Humanoide Interpretation bei Custom.',
  },
  {
    journeyId: 'shared-surface-reload',
    kind: 'shared',
    labelDe: 'Shared Surface Save/Reload',
    fixtureRef: 'domain:shared-avatar-surfaces',
    requiredChecks: ['shared-avatar-surfaces-check.mjs'],
    expectedOutcome: 'ready',
    notesDe: 'Composition axes persist across surfaces.',
  },
];

export const AVATAR_V2_SECURITY_MATRIX_V1: readonly AvatarV2SecurityCaseV1[] = [
  {
    caseId: 'cross-owner-artifact',
    labelDe: 'Cross-owner Artifact lesen/schreiben',
    expect: 'deny',
    notesDe: 'RLS/owner scope — mindestens zwei Owner in Tests.',
  },
  {
    caseId: 'manipulated-extras-sagadrive',
    labelDe: 'Manipulierte extras.sagadrive Capabilities',
    expect: 'fail-closed',
    notesDe: 'Metadata nie autoritative Capabilities.',
  },
  {
    caseId: 'provider-success-caps',
    labelDe: 'Provider Success → Capabilities',
    expect: 'strip',
    notesDe: 'Immer pending bis Analyzer/Revalidation.',
  },
  {
    caseId: 'invalid-artifact-url',
    labelDe: 'Freie/unsigned Provider-URL persistieren',
    expect: 'deny',
    notesDe: 'Nur owner-scoped Storage Keys.',
  },
  {
    caseId: 'asset-key-tamper',
    labelDe: 'Asset-Key / analysis claim spoof',
    expect: 'fail-closed',
    notesDe: 'Server revalidate; client preview non-authoritative.',
  },
];

export const AVATAR_V2_PERF_BUDGETS_V1: readonly AvatarV2PerfBudgetV1[] = [
  {
    metricId: 'structure-analyze-fixture',
    labelDe: 'Structure Analyzer Fixture',
    budgetMs: 50,
    notesDe: 'Pure domain fixture path — no GLB IO.',
  },
  {
    metricId: 'modular-generate-orchestration',
    labelDe: 'Modular Generate Orchestration',
    budgetMs: 20,
    notesDe: 'Domain job graph only.',
  },
  {
    metricId: 'import-summary-build',
    labelDe: 'Import Analysis Summary',
    budgetMs: 20,
    notesDe: 'DE summary build.',
  },
];

export function assertAvatarV2FinalAcceptanceInvariants(): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (AVATAR_V2_GOLDEN_MATRIX_V1.length < 12) issues.push('matrix too thin');
  const ids = new Set(AVATAR_V2_GOLDEN_MATRIX_V1.map((j) => j.journeyId));
  for (const id of AVATAR_V2_GOLDEN_JOURNEY_IDS) {
    if (!ids.has(id)) issues.push(`missing journey ${id}`);
  }
  const kinds = new Set(AVATAR_V2_GOLDEN_MATRIX_V1.map((j) => j.kind));
  for (const k of ['native', 'import', 'generate', 'custom', 'convert', 'invalid'] as const) {
    if (!kinds.has(k)) issues.push(`missing kind ${k}`);
  }
  if (AVATAR_V2_SECURITY_MATRIX_V1.length < 4) issues.push('security thin');
  if (!AVATAR_V2_SECURITY_MATRIX_V1.some((c) => c.caseId === 'provider-success-caps')) {
    issues.push('provider caps case');
  }
  if (AVATAR_V2_PERF_BUDGETS_V1.length < 2) issues.push('perf thin');
  for (const j of AVATAR_V2_GOLDEN_MATRIX_V1) {
    if (j.requiredChecks.length === 0) issues.push(`no checks ${j.journeyId}`);
  }
  return { ok: issues.length === 0, issues };
}
