/**
 * liveact-personal-calibration-store — local-only Profile V2 persistence (#449).
 * Location: src/domains/character/liveact/liveact-personal-calibration-store.ts
 *
 * Uses localStorage when available. No network. SSR-safe no-ops.
 * Persistence requires a complete owner+character scope — no shared `_default` key.
 */

import {
  LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
  LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
  isLiveActPersonalCalibrationScopeComplete,
  liveActPersonalCalibrationStorageKey,
  type LiveActCalibrationProfileV2,
  type LiveActPersonalCalibrationScopeV1,
  type LiveActPersonalProfileStatus,
} from './liveact-personal-calibration-contract';
import {
  assertLiveActPersonalProfileLocalOnly,
  resolveLiveActPersonalProfileStatus,
} from './liveact-personal-calibration-solve';

export interface LiveActPersonalProfileLoadResult {
  readonly profile: LiveActCalibrationProfileV2 | null;
  readonly status: LiveActPersonalProfileStatus | 'missing';
}

function getLocalStorage(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls || typeof ls.getItem !== 'function') return null;
    return ls;
  } catch {
    return null;
  }
}

function isProfileShape(value: unknown): value is LiveActCalibrationProfileV2 {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    p.contractVersion === LIVEACT_PERSONAL_CALIBRATION_CONTRACT &&
    typeof p.policyVersion === 'string' &&
    typeof p.solverFingerprint === 'object' &&
    typeof p.ownerLocalId === 'string' &&
    typeof p.characterLocalId === 'string' &&
    typeof p.head === 'object' &&
    typeof p.gaze === 'object' &&
    typeof p.channels === 'object' &&
    typeof p.speech === 'object'
  );
}

function scopeFromProfile(profile: LiveActCalibrationProfileV2): LiveActPersonalCalibrationScopeV1 {
  return {
    ownerLocalId: profile.ownerLocalId,
    characterLocalId: profile.characterLocalId,
  };
}

export function saveLiveActPersonalCalibrationProfile(
  profile: LiveActCalibrationProfileV2,
): boolean {
  assertLiveActPersonalProfileLocalOnly(profile);
  const scope = scopeFromProfile(profile);
  if (!isLiveActPersonalCalibrationScopeComplete(scope)) {
    // Fail closed: never write under a shared fallback key.
    return false;
  }
  const ls = getLocalStorage();
  if (!ls) return false;
  const key = liveActPersonalCalibrationStorageKey(scope);
  try {
    ls.setItem(key, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function loadLiveActPersonalCalibrationProfile(
  scope: LiveActPersonalCalibrationScopeV1 | null,
): LiveActPersonalProfileLoadResult {
  if (!isLiveActPersonalCalibrationScopeComplete(scope)) {
    return { profile: null, status: 'missing' };
  }
  const ls = getLocalStorage();
  if (!ls) return { profile: null, status: 'missing' };
  const key = liveActPersonalCalibrationStorageKey(scope);
  try {
    const raw = ls.getItem(key);
    if (!raw) return { profile: null, status: 'missing' };
    const parsed: unknown = JSON.parse(raw);
    if (!isProfileShape(parsed)) {
      return { profile: null, status: 'incompatible' };
    }
    if (parsed.policyVersion !== LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION) {
      return { profile: parsed, status: 'needsMigration' };
    }
    // Reject cross-scope pollution if a key was ever mistyped.
    if (
      parsed.ownerLocalId !== scope.ownerLocalId ||
      parsed.characterLocalId !== scope.characterLocalId
    ) {
      return { profile: null, status: 'incompatible' };
    }
    const status = resolveLiveActPersonalProfileStatus(parsed);
    return { profile: parsed, status };
  } catch {
    return { profile: null, status: 'incompatible' };
  }
}

export function clearLiveActPersonalCalibrationProfile(
  scope: LiveActPersonalCalibrationScopeV1 | null,
): void {
  if (!isLiveActPersonalCalibrationScopeComplete(scope)) return;
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(liveActPersonalCalibrationStorageKey(scope));
  } catch {
    // ignore
  }
}
