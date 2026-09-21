/**
 * LiveAct avatar output port — apply atomic frames to a character runtime (#329).
 * Location: src/infrastructure/character/liveact/liveact-avatar-output.ts
 *
 * Concrete VRM/GLB adapters land in LiveAct 4/7. This file is the typed port only.
 */

import type { LiveActFrameV1 } from '../../../domains/character/liveact';

/**
 * Consumer of LiveAct frames (CharacterStudioRuntime or future adapters).
 * Implementations must apply the full frame atomically — not per exclusive expression key.
 */
export interface LiveActAvatarOutput {
  applyLiveActFrame(frame: LiveActFrameV1): void;
  resetLiveActPose(): void;
}
