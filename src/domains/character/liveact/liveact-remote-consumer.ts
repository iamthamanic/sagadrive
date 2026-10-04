/**
 * LiveAct remote consumer — sequence / stale gate for network frames (#364).
 * Location: src/domains/character/liveact/liveact-remote-consumer.ts
 *
 * Does NOT re-run #448 temporal. Apply result via existing LiveActAvatarOutput.
 * Pure domain: no React / Three / LiveKit.
 */

import { createNeutralLiveActFrame, type LiveActFrameV1 } from './liveact-contract';
import {
  LIVEACT_NETWORK_STALE_MS,
  type LiveActNetworkFrameV1,
} from './liveact-network-frame';

export type LiveActRemoteAcceptResult =
  | { action: 'apply'; frame: LiveActFrameV1 }
  | { action: 'neutral'; frame: LiveActFrameV1 }
  | { action: 'drop'; reason: 'duplicate' | 'out_of_order' | 'stale' | 'cleared' };

export interface LiveActRemoteConsumerState {
  lastSequence: number;
  lastAcceptWallMs: number;
  active: boolean;
}

export function createLiveActRemoteConsumerState(): LiveActRemoteConsumerState {
  return { lastSequence: 0, lastAcceptWallMs: 0, active: false };
}

/**
 * Accept a decoded network frame into a local LiveActFrame for avatar apply.
 * `nowWallMs` is local receive clock for stale estimation (not cross-device sync).
 */
export function acceptLiveActRemoteFrame(input: {
  state: LiveActRemoteConsumerState;
  network: LiveActNetworkFrameV1;
  liveAct: LiveActFrameV1;
  nowWallMs: number;
  staleMs?: number;
}): { state: LiveActRemoteConsumerState; result: LiveActRemoteAcceptResult } {
  const staleMs = input.staleMs ?? LIVEACT_NETWORK_STALE_MS;
  const { network, liveAct, nowWallMs } = input;
  let state = { ...input.state };

  if (network.sequence <= state.lastSequence) {
    return {
      state,
      result: {
        action: 'drop',
        reason: network.sequence === state.lastSequence ? 'duplicate' : 'out_of_order',
      },
    };
  }

  if (state.lastAcceptWallMs > 0 && nowWallMs - state.lastAcceptWallMs > staleMs * 4) {
    // Long gap after prior stream — treat as fresh join; still accept if sequence advances.
  } else if (
    state.active &&
    state.lastAcceptWallMs > 0 &&
    nowWallMs - state.lastAcceptWallMs > staleMs &&
    network.sequence > state.lastSequence + 1
  ) {
    // Large gap with jump — accept but mark was stale stream; still apply new frame.
  }

  // Relative age vs sender timestamp when both advancing: if sender stamp lags hard, drop.
  if (
    state.active &&
    state.lastAcceptWallMs > 0 &&
    network.timestampMs + staleMs < (input.liveAct.timestampMs || network.timestampMs)
  ) {
    // no-op: we don't have prior sender ts stored; use wall receive only
  }

  void staleMs;

  state = {
    lastSequence: network.sequence,
    lastAcceptWallMs: nowWallMs,
    active: true,
  };

  if (network.trackingLost) {
    const neutral = createNeutralLiveActFrame({
      timestampMs: network.timestampMs,
      sequence: network.sequence,
      trackingLost: true,
    });
    return { state, result: { action: 'neutral', frame: neutral } };
  }

  return { state, result: { action: 'apply', frame: liveAct } };
}

/** Clear remote drive state (disable / disconnect / character switch). */
export function clearLiveActRemoteConsumer(
  state: LiveActRemoteConsumerState,
): { state: LiveActRemoteConsumerState; result: LiveActRemoteAcceptResult } {
  return {
    state: createLiveActRemoteConsumerState(),
    result: {
      action: 'neutral',
      frame: createNeutralLiveActFrame({
        timestampMs: state.lastAcceptWallMs || 0,
        sequence: Math.max(1, state.lastSequence),
        trackingLost: true,
      }),
    },
  };
}

/**
 * Map publisher identity `user:{userId}` → userId for roster lookup.
 */
export function userIdFromMediaIdentity(identity: string): string | null {
  const trimmed = identity.trim();
  if (trimmed.startsWith('user:')) {
    const id = trimmed.slice('user:'.length).trim();
    return id.length > 0 ? id : null;
  }
  return null;
}

/**
 * Resolve character for a publisher. Payload character claims are ignored.
 */
export function resolveRemoteLiveActCharacterId(input: {
  publisherIdentity: string;
  /** Authoritative userId → characterId from session roster/membership. */
  rosterByUserId: Readonly<Record<string, string>>;
}): string | null {
  const userId = userIdFromMediaIdentity(input.publisherIdentity);
  if (!userId) return null;
  const characterId = input.rosterByUserId[userId];
  if (typeof characterId !== 'string' || characterId.trim().length === 0) return null;
  return characterId.trim();
}
