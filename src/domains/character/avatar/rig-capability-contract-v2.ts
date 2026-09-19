/**
 * Avatar Rig / Capability Contract V2 — pure domain (#264 / Epic #248).
 * Location: src/domains/character/avatar/rig-capability-contract-v2.ts
 *
 * Separates generic skeleton/anchor/animation capabilities from the Humanoid
 * Rig V1 profile. Custom Creatures are first-class — no forced humanoid bones.
 * Evidence-only; source/provider claims never raise capabilities.
 */

import {
  RIG_CONTRACT_VERSION,
  SAGA_DRIVE_HUMANOID_ANCHORS,
  SAGA_DRIVE_HUMANOID_BONES,
  listMissingHumanoidBones,
  resolveAvatarRigCapabilities,
  type AvatarRigCapabilityFlag,
  type SagaDriveHumanoidAnchorId,
  type SagaDriveHumanoidBoneId,
  type SagaDriveHumanoidRigV1,
} from './rig-contract';

export const RIG_CAPABILITY_CONTRACT_V2_VERSION =
  'SagaDriveAvatarRigCapabilityV2' as const;

/** KISS: only humanoid + custom-creature (no speculative anatomy families). */
export const AVATAR_RIG_PROFILE_KINDS_V2 = ['humanoid', 'custom-creature'] as const;
export type AvatarRigProfileKindV2 = (typeof AVATAR_RIG_PROFILE_KINDS_V2)[number];

/**
 * Optional semantic anchors — usable on custom skeletons without full humanoid bones.
 * `other` is an explicit catch-all when evidence names a non-canonical socket.
 */
export const AVATAR_SEMANTIC_ANCHORS_V2 = [
  'head',
  'chest',
  'back',
  'hips',
  'leftHand',
  'rightHand',
  'leftFoot',
  'rightFoot',
  'other',
] as const;
export type AvatarSemanticAnchorIdV2 = (typeof AVATAR_SEMANTIC_ANCHORS_V2)[number];

/** Anchors safe without hands (Custom Creature edge case). */
export const AVATAR_SAFE_CUSTOM_ANCHORS_V2 = [
  'head',
  'chest',
  'back',
  'hips',
  'other',
] as const satisfies readonly AvatarSemanticAnchorIdV2[];

/**
 * V2 feature flags — animation/head/facial/rigid/custom-wearable are independent
 * of the `humanoid` ladder step (unlike V1, which gated rigid on full humanoid).
 */
export const AVATAR_RIG_CAPABILITY_FLAGS_V2 = [
  'static',
  'rigged',
  'animated',
  'humanoid',
  'head',
  'facial',
  'rigid-equipment',
  'custom-wearable',
  'vrm-ready',
  'skinned-wearable-ready',
] as const;
export type AvatarRigCapabilityFlagV2 = (typeof AVATAR_RIG_CAPABILITY_FLAGS_V2)[number];

export type AvatarRigAnalysisUiStatusV2 = 'analyzing' | 'ready' | 'limited' | 'failed';

/** Controlled golden fixtures for Human / Dwarf / Faruk-like profiles. */
export const CUSTOM_CREATURE_GOLDEN_FIXTURE_IDS = [
  'human',
  'dwarf',
  'faruk-like',
] as const;
export type CustomCreatureGoldenFixtureId =
  (typeof CUSTOM_CREATURE_GOLDEN_FIXTURE_IDS)[number];

export interface AvatarSkeletonEvidenceV2 {
  boneCount: number;
  /** Opaque source bone names — never required to match humanoid aliases. */
  sourceBoneNames: readonly string[];
  hasSkinnedMesh: boolean;
  hasVrmHumanoid: boolean;
  /**
   * Evidence-mapped semantic anchors only. Unknown skeletons must pass `{}`
   * rather than inventing sockets.
   */
  semanticAnchors: Readonly<Partial<Record<AvatarSemanticAnchorIdV2, string>>>;
  /** Custom / embedded animation clips without humanoid retarget. */
  hasCustomAnimationClips: boolean;
  /** Present facial expression / morph names (count only — names stay infra). */
  facialExpressionCount: number;
  scaleFactor: number;
  /**
   * Optional partial humanoid bone map. Empty for true custom creatures.
   * Never invent mappings from unknown skeletons.
   */
  mappedHumanoidBones?: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>;
}

export interface AvatarHumanoidProfileV2 {
  kind: 'humanoid';
  /** Compatibility adapter — preserves Humanoid Rig V1 wire shape. */
  rigV1: SagaDriveHumanoidRigV1;
  missingBones: readonly SagaDriveHumanoidBoneId[];
}

export interface AvatarCustomCreatureProfileV2 {
  kind: 'custom-creature';
  /** Fixture / species hint only — not an anatomy taxonomy. */
  skeletonHint: string;
  anchors: Readonly<Partial<Record<AvatarSemanticAnchorIdV2, string>>>;
}

export type AvatarRigProfileV2 = AvatarHumanoidProfileV2 | AvatarCustomCreatureProfileV2;

export interface AvatarRigCapabilitiesV2 {
  contractVersion: typeof RIG_CAPABILITY_CONTRACT_V2_VERSION;
  profile: AvatarRigProfileV2;
  flags: readonly AvatarRigCapabilityFlagV2[];
  /** V1 ladder for existing consumers (animation catalog, editor surfaces). */
  legacyFlags: readonly AvatarRigCapabilityFlag[];
  limitations: readonly string[];
  status: AvatarRigAnalysisUiStatusV2;
}

export interface CustomCreatureGoldenFixtureV2 {
  fixtureId: CustomCreatureGoldenFixtureId;
  labelDe: string;
  expectedProfileKind: AvatarRigProfileKindV2;
  evidence: AvatarSkeletonEvidenceV2;
  /** Minimum expected V2 flags (order-independent subset). */
  expectFlags: readonly AvatarRigCapabilityFlagV2[];
  /** Flags that must NOT appear. */
  forbidFlags: readonly AvatarRigCapabilityFlagV2[];
  goldenRef: string;
}

function isSemanticAnchorId(value: string): value is AvatarSemanticAnchorIdV2 {
  return (AVATAR_SEMANTIC_ANCHORS_V2 as readonly string[]).includes(value);
}

function countAnchors(
  anchors: Readonly<Partial<Record<AvatarSemanticAnchorIdV2, string>>>,
): number {
  return AVATAR_SEMANTIC_ANCHORS_V2.filter((id) => Boolean(anchors[id])).length;
}

function hasAnySafeCustomAnchor(
  anchors: Readonly<Partial<Record<AvatarSemanticAnchorIdV2, string>>>,
): boolean {
  return AVATAR_SAFE_CUSTOM_ANCHORS_V2.some((id) => Boolean(anchors[id]));
}

/**
 * Map Humanoid Rig V1 → V2 humanoid profile (adapter; does not mutate V1).
 */
export function mapHumanoidRigV1ToProfile(
  rig: SagaDriveHumanoidRigV1,
): AvatarHumanoidProfileV2 {
  return {
    kind: 'humanoid',
    rigV1: rig,
    missingBones: listMissingHumanoidBones(rig.bones),
  };
}

/**
 * Derive semantic anchors from a V1 bone map (compatibility path).
 */
export function deriveSemanticAnchorsFromHumanoidBones(
  bones: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>,
): Partial<Record<AvatarSemanticAnchorIdV2, string>> {
  const anchors: Partial<Record<AvatarSemanticAnchorIdV2, string>> = {};
  if (bones.head) anchors.head = bones.head;
  if (bones.chest) {
    anchors.chest = bones.chest;
    anchors.back = bones.chest;
  }
  if (bones.hips) anchors.hips = bones.hips;
  if (bones.leftHand) anchors.leftHand = bones.leftHand;
  if (bones.rightHand) anchors.rightHand = bones.rightHand;
  if (bones.leftFoot) anchors.leftFoot = bones.leftFoot;
  if (bones.rightFoot) anchors.rightFoot = bones.rightFoot;
  return anchors;
}

/**
 * Build a V1 rig snapshot from evidence (humanoid path only).
 */
export function buildHumanoidRigV1FromEvidence(
  evidence: AvatarSkeletonEvidenceV2,
): SagaDriveHumanoidRigV1 {
  const bones = evidence.mappedHumanoidBones ?? {};
  const semantic = deriveSemanticAnchorsFromHumanoidBones(bones);
  const anchors: Partial<Record<SagaDriveHumanoidAnchorId, string>> = {};
  for (const id of SAGA_DRIVE_HUMANOID_ANCHORS) {
    const name = semantic[id];
    if (name) anchors[id] = name;
  }
  return {
    contractVersion: RIG_CONTRACT_VERSION,
    bones,
    anchors,
    upAxis: 'y',
    forwardAxis: 'z',
    unit: 'meter',
    scaleFactor: evidence.scaleFactor,
  };
}

function resolveProfileKind(
  evidence: AvatarSkeletonEvidenceV2,
  preferredKind?: AvatarRigProfileKindV2,
): AvatarRigProfileKindV2 {
  if (preferredKind === 'custom-creature') return 'custom-creature';
  if (preferredKind === 'humanoid') return 'humanoid';
  const mapped = evidence.mappedHumanoidBones ?? {};
  const missing = listMissingHumanoidBones(mapped);
  // Full core humanoid → humanoid profile; otherwise custom (never invent humanoid).
  if (missing.length === 0 && Object.keys(mapped).length > 0) return 'humanoid';
  return 'custom-creature';
}

/**
 * Evidence-driven V2 capability resolver — source/provider-neutral.
 */
export function resolveAvatarRigCapabilitiesV2(input: {
  evidence: AvatarSkeletonEvidenceV2;
  /** Explicit anatomy preference from Composition V2 (optional). */
  preferredKind?: AvatarRigProfileKindV2;
  /** Opaque skeleton hint for custom creatures (e.g. faruk-like). */
  skeletonHint?: string;
}): AvatarRigCapabilitiesV2 {
  const { evidence } = input;
  const limitations: string[] = [];
  const flags: AvatarRigCapabilityFlagV2[] = ['static'];

  // Never trust empty/unknown anchor inventions — strip invalid keys.
  const sanitizedAnchors: Partial<Record<AvatarSemanticAnchorIdV2, string>> = {};
  for (const [key, value] of Object.entries(evidence.semanticAnchors)) {
    if (isSemanticAnchorId(key) && typeof value === 'string' && value.length > 0) {
      sanitizedAnchors[key] = value;
    }
  }

  const kind = resolveProfileKind(evidence, input.preferredKind);
  const mappedBones = evidence.mappedHumanoidBones ?? {};

  if (evidence.boneCount <= 0) {
    limitations.push('Kein Skelett erkannt — nur statische Vorschau.');
    const profile: AvatarRigProfileV2 =
      kind === 'humanoid'
        ? mapHumanoidRigV1ToProfile(buildHumanoidRigV1FromEvidence(evidence))
        : {
            kind: 'custom-creature',
            skeletonHint: input.skeletonHint ?? 'unknown',
            anchors: sanitizedAnchors,
          };
    return {
      contractVersion: RIG_CAPABILITY_CONTRACT_V2_VERSION,
      profile,
      flags,
      legacyFlags: ['static'],
      limitations,
      status: 'failed',
    };
  }

  flags.push('rigged');

  // Animation: custom clips OR enough humanoid bones for retarget — NOT forced static.
  const missingHumanoid = listMissingHumanoidBones(mappedBones);
  const canHumanoidAnimate = missingHumanoid.length === 0;
  if (evidence.hasCustomAnimationClips || canHumanoidAnimate) {
    flags.push('animated');
  } else if (evidence.boneCount > 0 && Object.keys(mappedBones).length === 0) {
    limitations.push(
      'Skelett ohne Humanoid-Mapping — Custom-Animation möglich, aber noch nicht nachgewiesen.',
    );
  }

  if (kind === 'humanoid' && canHumanoidAnimate) {
    flags.push('humanoid');
  } else if (kind === 'humanoid' && missingHumanoid.length > 0) {
    limitations.push(
      `Humanoid unvollständig (${missingHumanoid.length} Knochen fehlen) — Profil eingeschränkt.`,
    );
  }

  if (sanitizedAnchors.head) {
    flags.push('head');
  }

  if (evidence.facialExpressionCount > 0) {
    flags.push('facial');
  } else if (kind === 'humanoid') {
    limitations.push('Keine Facial-Shapes erkannt.');
  }

  // Rigid equipment: evidence anchors only — custom may use head/back/other without hands.
  if (countAnchors(sanitizedAnchors) > 0) {
    if (kind === 'custom-creature' && !hasAnySafeCustomAnchor(sanitizedAnchors)) {
      limitations.push(
        'Nur Hand-/Fuß-Anker ohne sichere Custom-Anker — starre Ausrüstung begrenzt.',
      );
    } else {
      flags.push('rigid-equipment');
    }
  } else if (kind === 'custom-creature') {
    limitations.push('Keine semantischen Anker — Custom Creature ohne Attach-Punkte.');
  }

  // Custom wearable path is for custom-creature only (not family skinned wearables).
  if (kind === 'custom-creature' && evidence.hasSkinnedMesh && flags.includes('rigged')) {
    flags.push('custom-wearable');
  }

  if (evidence.hasVrmHumanoid && canHumanoidAnimate) {
    flags.push('vrm-ready');
  } else if (evidence.hasVrmHumanoid) {
    limitations.push('VRM-Humanoid vorhanden, aber Mapping unvollständig.');
  }

  if (flags.includes('humanoid') && evidence.hasSkinnedMesh) {
    flags.push('skinned-wearable-ready');
  } else if (flags.includes('humanoid')) {
    limitations.push('Keine SkinnedMeshes — Wearables nur starr möglich.');
  }

  if (evidence.scaleFactor < 0.05 || evidence.scaleFactor > 20) {
    limitations.push('Extreme Skalierung — Anzeige normalisiert, Fähigkeiten begrenzt.');
  }

  // Unknown skeleton semantics: no mapped bones + no anchors → limited, never invent.
  if (
    kind === 'custom-creature' &&
    Object.keys(mappedBones).length === 0 &&
    countAnchors(sanitizedAnchors) === 0 &&
    !evidence.hasCustomAnimationClips
  ) {
    limitations.push(
      'Unbekannte Skelett-Semantik — limited, keine Anchor-Zuweisung ohne Evidence.',
    );
  }

  let profile: AvatarRigProfileV2;
  if (kind === 'humanoid') {
    profile = mapHumanoidRigV1ToProfile(buildHumanoidRigV1FromEvidence(evidence));
  } else {
    profile = {
      kind: 'custom-creature',
      skeletonHint: input.skeletonHint ?? 'custom',
      anchors: sanitizedAnchors,
    };
  }

  const legacy = resolveAvatarRigCapabilities({
    boneCount: evidence.boneCount,
    mappedBones,
    hasVrmHumanoid: evidence.hasVrmHumanoid,
    hasSkinnedMesh: evidence.hasSkinnedMesh,
    scaleFactor: evidence.scaleFactor,
  });

  // For custom creatures with animation evidence, do not collapse to static-only in V2
  // even when V1 legacy lacks humanoid — keep legacy honest (rigged without humanoid).
  const status = summarizeCapabilitiesStatusV2(flags, limitations);

  return {
    contractVersion: RIG_CAPABILITY_CONTRACT_V2_VERSION,
    profile,
    flags,
    legacyFlags: legacy.flags,
    limitations: [...new Set([...limitations, ...legacy.limitations])],
    status,
  };
}

export function summarizeCapabilitiesStatusV2(
  flags: readonly AvatarRigCapabilityFlagV2[],
  limitations: readonly string[],
): AvatarRigAnalysisUiStatusV2 {
  if (flags.includes('humanoid') && limitations.length === 0) return 'ready';
  if (
    flags.includes('animated') &&
    flags.includes('rigged') &&
    (flags.includes('head') || flags.includes('rigid-equipment') || flags.includes('custom-wearable'))
  ) {
    return limitations.length > 0 ? 'limited' : 'ready';
  }
  if (flags.includes('rigged') || flags.includes('static')) {
    return limitations.length > 0 ? 'limited' : 'ready';
  }
  return 'failed';
}

export function capabilityFlagLabelV2(flag: AvatarRigCapabilityFlagV2): string {
  switch (flag) {
    case 'static':
      return 'Statisch';
    case 'rigged':
      return 'Geriggt';
    case 'animated':
      return 'Animiert';
    case 'humanoid':
      return 'Humanoid';
    case 'head':
      return 'Kopf-Anker';
    case 'facial':
      return 'Facial';
    case 'rigid-equipment':
      return 'Starre Ausrüstung';
    case 'custom-wearable':
      return 'Custom Wearable';
    case 'vrm-ready':
      return 'VRM-bereit';
    case 'skinned-wearable-ready':
      return 'Skinned Wearables';
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

function fullHumanoidBones(
  prefix: string,
): Partial<Record<SagaDriveHumanoidBoneId, string>> {
  const bones: Partial<Record<SagaDriveHumanoidBoneId, string>> = {};
  for (const id of SAGA_DRIVE_HUMANOID_BONES) {
    bones[id] = `${prefix}_${id}`;
  }
  return bones;
}

/**
 * Golden fixtures — Human / Dwarf (humanoid) vs Faruk-like (custom creature).
 */
export function listCustomCreatureGoldenFixtures(): readonly CustomCreatureGoldenFixtureV2[] {
  const humanBones = fullHumanoidBones('Human');
  const dwarfBones = fullHumanoidBones('Dwarf');

  return [
    {
      fixtureId: 'human',
      labelDe: 'Mensch (Humanoid)',
      expectedProfileKind: 'humanoid',
      evidence: {
        boneCount: SAGA_DRIVE_HUMANOID_BONES.length,
        sourceBoneNames: SAGA_DRIVE_HUMANOID_BONES.map((id) => `Human_${id}`),
        hasSkinnedMesh: true,
        hasVrmHumanoid: true,
        semanticAnchors: deriveSemanticAnchorsFromHumanoidBones(humanBones),
        hasCustomAnimationClips: false,
        facialExpressionCount: 8,
        scaleFactor: 1,
        mappedHumanoidBones: humanBones,
      },
      expectFlags: [
        'static',
        'rigged',
        'animated',
        'humanoid',
        'head',
        'facial',
        'rigid-equipment',
        'vrm-ready',
        'skinned-wearable-ready',
      ],
      forbidFlags: ['custom-wearable'],
      goldenRef: 'fixtures/avatar-v2/golden/rig-profile-human.json',
    },
    {
      fixtureId: 'dwarf',
      labelDe: 'Zwerg (Humanoid, Compact-Proportionen)',
      expectedProfileKind: 'humanoid',
      evidence: {
        boneCount: SAGA_DRIVE_HUMANOID_BONES.length,
        sourceBoneNames: SAGA_DRIVE_HUMANOID_BONES.map((id) => `Dwarf_${id}`),
        hasSkinnedMesh: true,
        hasVrmHumanoid: false,
        semanticAnchors: deriveSemanticAnchorsFromHumanoidBones(dwarfBones),
        hasCustomAnimationClips: false,
        facialExpressionCount: 4,
        scaleFactor: 0.85,
        mappedHumanoidBones: dwarfBones,
      },
      expectFlags: [
        'static',
        'rigged',
        'animated',
        'humanoid',
        'head',
        'facial',
        'rigid-equipment',
        'skinned-wearable-ready',
      ],
      forbidFlags: ['custom-wearable', 'vrm-ready'],
      goldenRef: 'fixtures/avatar-v2/golden/rig-profile-dwarf.json',
    },
    {
      fixtureId: 'faruk-like',
      labelDe: 'Faruk-artig (Custom Creature, ohne Hände)',
      expectedProfileKind: 'custom-creature',
      evidence: {
        boneCount: 12,
        sourceBoneNames: [
          'Faruk_Root',
          'Faruk_Shell',
          'Faruk_Head',
          'Faruk_BackRidge',
          'Faruk_Hips',
          'Faruk_TailA',
          'Faruk_TailB',
        ],
        hasSkinnedMesh: true,
        hasVrmHumanoid: false,
        semanticAnchors: {
          head: 'Faruk_Head',
          back: 'Faruk_BackRidge',
          hips: 'Faruk_Hips',
          other: 'Faruk_Shell',
        },
        hasCustomAnimationClips: true,
        facialExpressionCount: 0,
        scaleFactor: 1.2,
        mappedHumanoidBones: {},
      },
      expectFlags: [
        'static',
        'rigged',
        'animated',
        'head',
        'rigid-equipment',
        'custom-wearable',
      ],
      forbidFlags: ['humanoid', 'vrm-ready', 'skinned-wearable-ready', 'facial'],
      goldenRef: 'fixtures/avatar-v2/golden/rig-profile-faruk-like.json',
    },
  ];
}

export function resolveGoldenFixtureCapabilities(
  fixtureId: CustomCreatureGoldenFixtureId,
): AvatarRigCapabilitiesV2 {
  const fixture = listCustomCreatureGoldenFixtures().find((f) => f.fixtureId === fixtureId);
  if (!fixture) {
    return resolveAvatarRigCapabilitiesV2({
      evidence: {
        boneCount: 0,
        sourceBoneNames: [],
        hasSkinnedMesh: false,
        hasVrmHumanoid: false,
        semanticAnchors: {},
        hasCustomAnimationClips: false,
        facialExpressionCount: 0,
        scaleFactor: 1,
      },
      preferredKind: 'custom-creature',
      skeletonHint: 'unknown',
    });
  }
  return resolveAvatarRigCapabilitiesV2({
    evidence: fixture.evidence,
    preferredKind: fixture.expectedProfileKind,
    skeletonHint: fixture.fixtureId,
  });
}

/**
 * Invariants for check scripts / composition-gate.
 */
export function assertCustomCreatureContractInvariants(): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const fixtures = listCustomCreatureGoldenFixtures();

  if (fixtures.length < 3) {
    issues.push('need ≥3 golden fixtures (human, dwarf, faruk-like)');
  }

  for (const fixture of fixtures) {
    const caps = resolveGoldenFixtureCapabilities(fixture.fixtureId);
    if (caps.profile.kind !== fixture.expectedProfileKind) {
      issues.push(
        `${fixture.fixtureId}: expected profile ${fixture.expectedProfileKind}, got ${caps.profile.kind}`,
      );
    }
    for (const flag of fixture.expectFlags) {
      if (!caps.flags.includes(flag)) {
        issues.push(`${fixture.fixtureId}: missing flag ${flag}`);
      }
    }
    for (const flag of fixture.forbidFlags) {
      if (caps.flags.includes(flag)) {
        issues.push(`${fixture.fixtureId}: forbidden flag ${flag}`);
      }
    }
  }

  // Edge: custom without hands still gets head/back/other rigid path.
  const noHands = resolveAvatarRigCapabilitiesV2({
    preferredKind: 'custom-creature',
    skeletonHint: 'no-hands',
    evidence: {
      boneCount: 5,
      sourceBoneNames: ['Root', 'Head', 'Back', 'Hips'],
      hasSkinnedMesh: false,
      hasVrmHumanoid: false,
      semanticAnchors: { head: 'Head', back: 'Back', hips: 'Hips' },
      hasCustomAnimationClips: true,
      facialExpressionCount: 0,
      scaleFactor: 1,
      mappedHumanoidBones: {},
    },
  });
  if (noHands.profile.kind !== 'custom-creature') {
    issues.push('no-hands edge: expected custom-creature');
  }
  if (!noHands.flags.includes('animated')) {
    issues.push('no-hands edge: custom animation must yield animated (not static-only)');
  }
  if (!noHands.flags.includes('rigid-equipment') || !noHands.flags.includes('head')) {
    issues.push('no-hands edge: head/back/hips must enable rigid + head');
  }
  if (noHands.flags.includes('humanoid')) {
    issues.push('no-hands edge: must not invent humanoid');
  }

  // Edge: unknown skeleton → limited, no invented anchors.
  const unknown = resolveAvatarRigCapabilitiesV2({
    preferredKind: 'custom-creature',
    skeletonHint: 'unknown',
    evidence: {
      boneCount: 8,
      sourceBoneNames: ['BoneA', 'BoneB', 'BoneC'],
      hasSkinnedMesh: false,
      hasVrmHumanoid: false,
      semanticAnchors: {},
      hasCustomAnimationClips: false,
      facialExpressionCount: 0,
      scaleFactor: 1,
      mappedHumanoidBones: {},
    },
  });
  if (unknown.status !== 'limited') {
    issues.push(`unknown skeleton: expected limited, got ${unknown.status}`);
  }
  if (unknown.flags.includes('rigid-equipment') || unknown.flags.includes('humanoid')) {
    issues.push('unknown skeleton: must not invent rigid/humanoid');
  }
  if (unknown.profile.kind === 'custom-creature' && countAnchors(unknown.profile.anchors) > 0) {
    issues.push('unknown skeleton: must not invent anchors');
  }

  // Humanoid V1 regression: full map still humanoid via V2 adapter.
  const human = resolveGoldenFixtureCapabilities('human');
  if (human.profile.kind !== 'humanoid' || !human.flags.includes('humanoid')) {
    issues.push('human fixture must remain full humanoid');
  }
  if (human.profile.kind === 'humanoid') {
    if (human.profile.rigV1.contractVersion !== RIG_CONTRACT_VERSION) {
      issues.push('humanoid profile must preserve Rig V1 contract version');
    }
    if (human.profile.missingBones.length !== 0) {
      issues.push('human fixture must have zero missing bones');
    }
  }

  // V1 resolver still works for humanoid bones (regression).
  const v1 = resolveAvatarRigCapabilities({
    boneCount: SAGA_DRIVE_HUMANOID_BONES.length,
    mappedBones: fullHumanoidBones('Reg'),
    hasVrmHumanoid: true,
    hasSkinnedMesh: true,
    scaleFactor: 1,
  });
  if (!v1.flags.includes('humanoid') || !v1.flags.includes('rigid-equipment-ready')) {
    issues.push('V1 resolveAvatarRigCapabilities regression');
  }

  return { ok: issues.length === 0, issues };
}
