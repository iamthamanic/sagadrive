/**
 * Performance Face V2 validator + Caps V1 compose (#450).
 * Location: src/domains/character/liveact/liveact-performance-face-validate.ts
 *
 * Deterministic: same inventory → same report. Premium gaps never block import.
 * Pure domain: no React / Three / MediaPipe.
 */

import {
  composeLiveActCapabilities,
  type LiveActAvatarCapabilities,
  type LiveActCapabilitiesV1,
  type LiveActInputCapabilities,
} from './liveact-capabilities';
import { checkLiveActFaceAssetProfile } from './liveact-face-asset-contract';
import type { LiveActGazeDrivePath } from './liveact-gaze-path';
import { resolvePerformanceFaceTargets } from './liveact-performance-face-aliases';
import {
  LIVEACT_ACTIVE_CAPABILITY_CONTRACT,
  PERFORMANCE_FACE_ALL_CONTROLS,
  PERFORMANCE_FACE_LEVEL_LABELS,
  PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS,
  PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS,
  PERFORMANCE_FACE_VALIDATOR_VERSION,
  SAGADRIVE_PERFORMANCE_FACE_CONTRACT,
  clampPerformanceFaceWeight,
  computeCorrectiveWeight,
  type PerformanceFaceCapabilityLevel,
  type PerformanceFaceControlId,
  type PerformanceFaceCorrectiveCapabilityV1,
  type PerformanceFaceCorrectiveDeclarationV1,
  type PerformanceFaceManifestV1,
  type PerformanceFaceValidationReportV1,
} from './liveact-performance-face-contract';

export interface PerformanceFaceInventoryV1 {
  /** Morph / expression target names present on the asset. */
  presentTargetNames: readonly string[];
  /** Humanoid skeleton / VRM humanoid evidence. */
  hasHumanoid: boolean;
  /** Head bone or VRM head support. */
  hasHead: boolean;
  /** Bind-time gaze path (bones / lookAt / morphs / none). */
  gazeDrivePath: LiveActGazeDrivePath;
  /**
   * ARKit-compatible channel ids already resolved (Caps V1 / Face Asset).
   * Prefer resolved LiveAct channel ids, not raw exporter aliases.
   */
  arkitPresentChannels: readonly string[];
  /** Optional manifest — never sole Premium authority. */
  manifest?: PerformanceFaceManifestV1 | null;
  /**
   * Filename / URL / preset hint — intentionally ignored for eligibility.
   * Accepted only so callers can prove hacks do not grant Premium.
   */
  filenameHint?: string;
}

export interface LiveActActiveCapabilityV2 {
  contractVersion: typeof LIVEACT_ACTIVE_CAPABILITY_CONTRACT;
  liveact: LiveActCapabilitiesV1;
  performanceFace: PerformanceFaceValidationReportV1;
  capabilityLevel: PerformanceFaceCapabilityLevel;
}

function evaluateCorrectives(
  presentTargetNames: ReadonlySet<string>,
  declarations: readonly PerformanceFaceCorrectiveDeclarationV1[] | undefined,
): PerformanceFaceCorrectiveCapabilityV1 {
  if (!declarations || declarations.length === 0) {
    return { present: [], missingRequired: [], missingOptional: [] };
  }
  const present: string[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  for (const decl of declarations) {
    if (presentTargetNames.has(decl.id)) {
      present.push(decl.id);
      continue;
    }
    if (decl.required === true) missingRequired.push(decl.id);
    else missingOptional.push(decl.id);
  }
  return { present, missingRequired, missingOptional };
}

/**
 * Validate PerformanceFaceV2 against parsed asset evidence.
 * Missing Premium never sets importAllowed false.
 */
export function validatePerformanceFaceV2(
  inventory: PerformanceFaceInventoryV1,
): PerformanceFaceValidationReportV1 {
  const warnings: string[] = [];
  const resolution = resolvePerformanceFaceTargets(inventory.presentTargetNames);
  const presentNames = new Set(inventory.presentTargetNames);

  const supportedControls: PerformanceFaceControlId[] = [];
  for (const id of PERFORMANCE_FACE_ALL_CONTROLS) {
    if (resolution.supported.has(id)) supportedControls.push(id);
  }

  const missingRequired = PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS.filter(
    (id) => !resolution.supported.has(id),
  );
  const missingOptional = PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS.filter(
    (id) => !resolution.supported.has(id),
  );

  for (const id of missingOptional) {
    warnings.push(`Optionales Premium-Control fehlt: ${id}`);
  }

  const correctiveCapability = evaluateCorrectives(
    presentNames,
    inventory.manifest?.correctives,
  );
  for (const id of correctiveCapability.missingOptional) {
    warnings.push(`Optionales Corrective fehlt: ${id}`);
  }
  for (const id of correctiveCapability.missingRequired) {
    warnings.push(`Erforderliches Corrective fehlt: ${id}`);
  }

  // Filename / URL / preset never grants capability.
  if (inventory.filenameHint) {
    const lower = inventory.filenameHint.toLowerCase();
    if (lower.includes('premium') || lower.includes('performance')) {
      warnings.push(
        'Dateiname/URL enthält „premium/performance“ — wird für Eligibility ignoriert',
      );
    }
  }

  const arkitPresent = inventory.arkitPresentChannels;
  const coreCheck = checkLiveActFaceAssetProfile(
    {
      presentChannels: arkitPresent,
      hasEyeBones:
        inventory.gazeDrivePath === 'bones' || inventory.gazeDrivePath === 'lookAt',
    },
    'core-v1',
    inventory.gazeDrivePath === 'morphs'
      ? 'morphs'
      : inventory.gazeDrivePath === 'bones' || inventory.gazeDrivePath === 'lookAt'
        ? 'bones'
        : 'none',
  );

  const standardFaceOk = coreCheck.ok && !coreCheck.missingGaze;
  const gazeOk = inventory.gazeDrivePath !== 'none';
  // Level 2: humanoid + head + (gaze path or documented degrade with face floor).
  const standardEligible =
    inventory.hasHumanoid &&
    inventory.hasHead &&
    standardFaceOk &&
    (gazeOk || standardFaceOk);

  if (inventory.manifest?.claimedLevel === 3 && missingRequired.length > 0) {
    warnings.push(
      'Manifest beansprucht Premium, aber erforderliche Morph-/Expression-Controls fehlen',
    );
  }
  if (
    inventory.manifest?.claimedLevel === 3 &&
    missingRequired.length === 0 &&
    correctiveCapability.missingRequired.length === 0 &&
    supportedControls.length === 0
  ) {
    warnings.push('Manifest-Premium ohne aufgelöste Controls — Morph-Evidenz fehlt');
  }

  const premiumControlsOk = missingRequired.length === 0;
  const premiumCorrectivesOk = correctiveCapability.missingRequired.length === 0;
  const premiumEligible =
    standardEligible && premiumControlsOk && premiumCorrectivesOk;

  let capabilityLevel: PerformanceFaceCapabilityLevel = 0;
  if (!inventory.hasHumanoid) {
    capabilityLevel = 0;
  } else if (!standardEligible) {
    capabilityLevel = 1;
  } else if (!premiumEligible) {
    capabilityLevel = 2;
  } else {
    capabilityLevel = 3;
  }

  return {
    contractVersion: SAGADRIVE_PERFORMANCE_FACE_CONTRACT,
    validatorVersion: PERFORMANCE_FACE_VALIDATOR_VERSION,
    capabilityLevel,
    standardEligible,
    premiumEligible,
    supportedControls,
    missingRequired,
    missingOptional,
    warnings,
    gazeCapability: inventory.gazeDrivePath,
    correctiveCapability,
    importAllowed: true,
    resolvedTargetNames: resolution.resolvedNames,
  };
}

/**
 * Compose Input Caps × Avatar Caps V1 × PerformanceFace → active capability.
 * Does not mutate Caps V1 avatarFace with non-ARKit keys.
 */
export function composeLiveActWithPerformanceFace(
  input: LiveActInputCapabilities,
  avatar: LiveActAvatarCapabilities,
  performanceFace: PerformanceFaceValidationReportV1,
): LiveActActiveCapabilityV2 {
  const liveact = composeLiveActCapabilities(input, avatar);
  return {
    contractVersion: LIVEACT_ACTIVE_CAPABILITY_CONTRACT,
    liveact,
    performanceFace,
    capabilityLevel: performanceFace.capabilityLevel,
  };
}

/**
 * Import integration: always allows import; Premium gaps only downgrade eligibility.
 */
export function evaluatePerformanceFaceForImport(
  inventory: PerformanceFaceInventoryV1,
): {
  importAllowed: true;
  blocksImport: false;
  report: PerformanceFaceValidationReportV1;
} {
  const report = validatePerformanceFaceV2(inventory);
  return {
    importAllowed: true,
    blocksImport: false,
    report,
  };
}

/**
 * DE human-readable report for UI / CLI (when surfaced).
 */
export function formatPerformanceFaceReportDe(
  report: PerformanceFaceValidationReportV1,
): string {
  const lines: string[] = [
    `LiveAct Standard: ${report.standardEligible ? 'PASS' : 'NOT AVAILABLE'}`,
    `LiveAct Premium: ${report.premiumEligible ? 'PASS' : 'NOT AVAILABLE'}`,
    `Stufe: ${report.capabilityLevel} (${PERFORMANCE_FACE_LEVEL_LABELS[report.capabilityLevel]})`,
  ];

  const missing: string[] = [
    ...report.missingRequired.map((id) => `${id} (erforderlich für Premium)`),
    ...report.missingOptional.map((id) => `${id} (optional)`),
    ...report.correctiveCapability.missingRequired.map(
      (id) => `Corrective ${id} (erforderlich)`,
    ),
    ...report.correctiveCapability.missingOptional.map(
      (id) => `Corrective ${id} (optional)`,
    ),
  ];
  if (missing.length > 0) {
    lines.push('Missing:');
    for (const m of missing) lines.push(`- ${m}`);
  } else {
    lines.push('Missing: —');
  }

  if (report.standardEligible) {
    lines.push('Fallback: ARKit52-kompatibles Face bleibt verfügbar.');
  } else if (report.capabilityLevel >= 1) {
    lines.push('Fallback: Humanoid/Animation ohne LiveAct-Face.');
  } else {
    lines.push('Fallback: Darstellung ohne LiveAct-Promise.');
  }

  if (report.warnings.length > 0) {
    lines.push('Hinweise:');
    for (const w of report.warnings) lines.push(`- ${w}`);
  }

  lines.push(`Import: erlaubt (Premium fehlt blockiert den Import nicht).`);
  return lines.join('\n');
}

/**
 * Apply PerformanceFace weights via caller-supplied writer (drivers first).
 * Correctives applied after drivers when declarations + driver weights provided.
 */
export function applyPerformanceFaceWeights(input: {
  writeWeight: (targetName: string, weight: number) => void;
  resolvedNames: Readonly<Partial<Record<PerformanceFaceControlId, string>>>;
  weights: Readonly<Partial<Record<PerformanceFaceControlId, number>>>;
  correctives?: readonly PerformanceFaceCorrectiveDeclarationV1[];
  /** Driver id → current weight (PerformanceFace + ARKit). */
  driverWeights?: Readonly<Record<string, number>>;
}): void {
  for (const id of PERFORMANCE_FACE_ALL_CONTROLS) {
    const target = input.resolvedNames[id];
    if (!target) continue;
    const w = input.weights[id];
    if (w === undefined) continue;
    input.writeWeight(target, clampPerformanceFaceWeight(w));
  }

  if (!input.correctives?.length || !input.driverWeights) return;
  for (const decl of input.correctives) {
    const driverVals = decl.drivers.map((d) => input.driverWeights?.[d] ?? 0);
    const weight = computeCorrectiveWeight(driverVals, decl.weightRule);
    input.writeWeight(decl.id, weight);
  }
}
