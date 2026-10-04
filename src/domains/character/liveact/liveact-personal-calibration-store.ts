/**
 * liveact-personal-calibration-store — local-only Profile V2 persistence (#449).
 * Location: src/domains/character/liveact/liveact-personal-calibration-store.ts
 *
 * Uses localStorage when available. No network. SSR-safe no-ops.
 */

import {
  LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
  LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
  liveActPersonalCalibrationStorageKey,
  type LiveActCalibrationProfileV2,
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
    typeof p.head === 'object' &&
    typeof p.gaze === 'object' &&
    typeof p.channels === 'object' &&
    typeof p.speech === 'object'
  );
}

export function saveLiveActPersonalCalibrationProfile(
  profile: LiveActCalibrationProfileV2,
): boolean {
  assertLiveActPersonalProfileLocalOnly(profile);
  const ls = getLocalStorage();
  if (!ls) return false;
  const key = liveActPersonalCalibrationStorageKey(profile.characterLocalId);
  try {
    ls.setItem(key, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function loadLiveActPersonalCalibrationProfile(
  characterLocalId: string | null,
): LiveActPersonalProfileLoadResult {
  const ls = getLocalStorage();
  if (!ls) return { profile: null, status: 'missing' };
  const key = liveActPersonalCalibrationStorageKey(characterLocalId);
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
    const status = resolveLiveActPersonalProfileStatus(parsed);
    return { profile: parsed, status };
  } catch {
    return { profile: null, status: 'incompatible' };
  }
}

export function clearLiveActPersonalCalibrationProfile(characterLocalId: string | null): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(liveActPersonalCalibrationStorageKey(characterLocalId));
  } catch {
    // ignore
  }
}
