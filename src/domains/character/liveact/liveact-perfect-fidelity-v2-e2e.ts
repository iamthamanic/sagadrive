/**
 * Perfect Fidelity V2 E2E pipeline — dual-avatar Premium gate helpers (#451).
 * Location: src/domains/character/liveact/liveact-perfect-fidelity-v2-e2e.ts
 *
 * Deterministic fixture inventories + drive/apply/contour — no webcam.
 */

import { LIVEACT_FACE_ASSET_CORE_V1_CHANNELS } from './liveact-face-asset-contract';
import { mergeLiveActFaceChannels } from './liveact-face-contract';
import { solveHybridFace } from './liveact-hybrid-face-solve';
import {
  PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS,
  isPerformanceFaceControlId,
  type PerformanceFaceControlId,
  type PerformanceFaceValidationReportV1,
} from './liveact-performance-face-contract';
import {
  drivePerformanceFaceWeights,
  measurePerformanceFaceContourProxy,
} from './liveact-performance-face-drive';
import {
  applyPerformanceFaceWeights,
  validatePerformanceFaceV2,
  type PerformanceFaceInventoryV1,
} from './liveact-performance-face-validate';

export const LIVEACT_PERFECT_FIDELITY_V2_E2E_CONTRACT =
  'SagaDriveLiveActPerfectFidelityV2E2E' as const;

export interface PerfectFidelityV2AvatarProfile {
  id: 'canonical-face3' | 'external-premium-fixture';
  label: string;
  inventory: PerformanceFaceInventoryV1;
  /** When true, Premium FAIL is an accepted documented blocker (canonical today). */
  premiumBlockerAllowed: boolean;
}

export function buildCoreArkitChannels(): readonly string[] {
  return [...LIVEACT_FACE_ASSET_CORE_V1_CHANNELS];
}

/** Canonical face3-style: ARKit core only — Premium morphs absent (blocker). */
export function buildCanonicalFace3Inventory(): PerformanceFaceInventoryV1 {
  const arkit = buildCoreArkitChannels();
  return {
    presentTargetNames: [...arkit],
    hasHumanoid: true,
    hasHead: true,
    gazeDrivePath: 'bones',
    arkitPresentChannels: arkit,
    filenameHint: 'm5-face3.glb',
  };
}

/** External Premium-capable inventory (committed fixture — explicit morph names). */
export function buildExternalPremiumInventory(): PerformanceFaceInventoryV1 {
  const arkit = buildCoreArkitChannels();
  return {
    presentTargetNames: [
      ...arkit,
      ...PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS,
      'lidTightenLeft',
      'lidTightenRight',
    ],
    hasHumanoid: true,
    hasHead: true,
    gazeDrivePath: 'bones',
    arkitPresentChannels: arkit,
    filenameHint: 'external-arkit-only-name.glb',
  };
}

export function listPerfectFidelityV2AvatarProfiles(): readonly PerfectFidelityV2AvatarProfile[] {
  return [
    {
      id: 'canonical-face3',
      label: 'Canonical Human face3 (Standard; Premium morphs blocker)',
      inventory: buildCanonicalFace3Inventory(),
      premiumBlockerAllowed: true,
    },
    {
      id: 'external-premium-fixture',
      label: 'External Premium fixture inventory',
      inventory: buildExternalPremiumInventory(),
      premiumBlockerAllowed: false,
    },
  ];
}

export interface PerfectFidelityV2AvatarGateResult {
  profileId: PerfectFidelityV2AvatarProfile['id'];
  report: PerformanceFaceValidationReportV1;
  standardOk: boolean;
  premiumOk: boolean;
  premiumBlockerDocumented: boolean;
  filenameHackBlocked: boolean;
}

export function evaluatePerfectFidelityV2Avatar(
  profile: PerfectFidelityV2AvatarProfile,
): PerfectFidelityV2AvatarGateResult {
  const report = validatePerformanceFaceV2(profile.inventory);
  const premiumBlockerDocumented =
    profile.premiumBlockerAllowed &&
    report.standardEligible &&
    !report.premiumEligible &&
    report.missingRequired.length > 0;
  return {
    profileId: profile.id,
    report,
    standardOk: report.standardEligible,
    premiumOk: report.premiumEligible,
    premiumBlockerDocumented,
    filenameHackBlocked: report.warnings.some((w) => /ignoriert/i.test(w)),
  };
}

export interface PerfectFidelityV2E2eReport {
  contractVersion: typeof LIVEACT_PERFECT_FIDELITY_V2_E2E_CONTRACT;
  avatars: readonly PerfectFidelityV2AvatarGateResult[];
  standardFallbackGreen: boolean;
  externalPremiumPass: boolean;
  canonicalPremiumBlockerOk: boolean;
  applyPath: {
    appliedControls: number;
    contour: ReturnType<typeof measurePerformanceFaceContourProxy>;
  };
  privacy: { biometricsCommitted: false };
}

/**
 * Run dual-avatar validation + Premium apply/contour on external fixture.
 */
export function runPerfectFidelityV2E2e(): PerfectFidelityV2E2eReport {
  const profiles = listPerfectFidelityV2AvatarProfiles();
  const avatars = profiles.map(evaluatePerfectFidelityV2Avatar);
  const canonical = avatars.find((a) => a.profileId === 'canonical-face3');
  const external = avatars.find((a) => a.profileId === 'external-premium-fixture');

  const face = mergeLiveActFaceChannels({
    noseSneerLeft: 0.55,
    noseSneerRight: 0.5,
    cheekPuff: 0.4,
    cheekSquintLeft: 0.35,
    cheekSquintRight: 0.32,
    mouthUpperUpLeft: 0.45,
    mouthUpperUpRight: 0.42,
    mouthLowerDownLeft: 0.38,
    mouthLowerDownRight: 0.36,
    eyeSquintLeft: 0.2,
    eyeSquintRight: 0.18,
  });

  const hybrid = solveHybridFace({
    semanticFace: face,
    dense: null,
    sequence: 1,
    timestampMs: 0,
    denseSequence: null,
  });

  const weights = drivePerformanceFaceWeights({ hybrid, face });
  const written: Partial<Record<PerformanceFaceControlId, number>> = {};
  const externalReport = external?.report;
  if (externalReport?.premiumEligible) {
    applyPerformanceFaceWeights({
      writeWeight: (name, w) => {
        if (isPerformanceFaceControlId(name)) written[name] = w;
      },
      resolvedNames: externalReport.resolvedTargetNames,
      weights,
    });
  }
  const contour = measurePerformanceFaceContourProxy(written);

  return {
    contractVersion: LIVEACT_PERFECT_FIDELITY_V2_E2E_CONTRACT,
    avatars,
    standardFallbackGreen: Boolean(canonical?.standardOk && !canonical.premiumOk),
    externalPremiumPass: Boolean(external?.premiumOk),
    canonicalPremiumBlockerOk: Boolean(canonical?.premiumBlockerDocumented),
    applyPath: {
      appliedControls: Object.keys(written).length,
      contour,
    },
    privacy: { biometricsCommitted: false },
  };
}
