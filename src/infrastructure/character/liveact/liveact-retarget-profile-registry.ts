/**
 * liveact-retarget-profile-registry — select LiveActRetargetProfileV1 by capability (#403).
 * Location: src/infrastructure/character/liveact/liveact-retarget-profile-registry.ts
 *
 * Selection is capability/metadata based — never filename substrings.
 * Default remains identity until RAW→APPLIED evidence documents a gain/deadZone override.
 */

import {
  createIdentityLiveActRetargetProfile,
  type LiveActAvatarCapabilities,
  type LiveActRetargetProfileV1,
} from '../../../domains/character/liveact';

export interface LiveActRetargetProfileSelectionInput {
  /** Validated avatar capability matrix from the bound output adapter. */
  avatarCapabilities: LiveActAvatarCapabilities | null;
  /**
   * Optional evidence note for future QA-documented overrides.
   * Unused while identity is the shipped default (#403).
   */
  evidenceNote?: string | null;
}

/**
 * Resolve retarget profile for the active avatar.
 * Identity until a later slice ships evidence-backed sparse overrides.
 */
export function resolveLiveActRetargetProfile(
  _input: LiveActRetargetProfileSelectionInput,
): LiveActRetargetProfileV1 {
  return createIdentityLiveActRetargetProfile();
}
