/**
 * LiveAct session transport — calibrated frames ↔ Media Plane data (#364).
 * Location: src/infrastructure/character/liveact/liveact-session-transport.ts
 *
 * Publishes post-temporal calibrated frames only. Consumer does not re-smooth.
 * Character binding uses roster map; payload character claims ignored.
 */

import type { LiveActFrameV1 } from '../../../domains/character/liveact';
import {
  LIVEACT_NETWORK_MAX_SEND_HZ,
  LIVEACT_NETWORK_TOPIC,
  encodeLiveActNetworkFrame,
  parseLiveActNetworkFrameJson,
  serializeLiveActNetworkFrame,
} from '../../../domains/character/liveact/liveact-network-frame';
import {
  acceptLiveActRemoteFrame,
  clearLiveActRemoteConsumer,
  createLiveActRemoteConsumerState,
  resolveRemoteLiveActCharacterId,
  type LiveActRemoteConsumerState,
} from '../../../domains/character/liveact/liveact-remote-consumer';
import type { SessionMediaPlane } from '../../session/media/session-media-plane';

export type LiveActRemoteApplyTarget = {
  applyLiveActFrame(frame: LiveActFrameV1): void;
  resetLiveActPose(): void;
};

export type LiveActSessionTransportOptions = {
  readonly mediaPlane: SessionMediaPlane;
  /** Subscribe calibrated frames from LiveActEngine.subscribeFrame. */
  readonly subscribeLocalFrame: (listener: (frame: LiveActFrameV1) => void) => () => void;
  /** Authoritative userId → characterId. */
  readonly getRosterByUserId: () => Readonly<Record<string, string>>;
  /** Resolve avatar output for a character (remote apply). */
  readonly getOutputForCharacter: (characterId: string) => LiveActRemoteApplyTarget | null;
  readonly canPublish: boolean;
  readonly nowMs?: () => number;
  readonly maxSendHz?: number;
};

export class LiveActSessionTransport {
  private unsubLocal: (() => void) | null = null;
  private unsubData: (() => void) | null = null;
  private lastSendMs = 0;
  private lastSentSequence = 0;
  private readonly remoteByIdentity = new Map<string, LiveActRemoteConsumerState>();
  private readonly nowMs: () => number;
  private readonly minSendIntervalMs: number;

  constructor(private readonly options: LiveActSessionTransportOptions) {
    this.nowMs = options.nowMs ?? (() => Date.now());
    const hz = options.maxSendHz ?? LIVEACT_NETWORK_MAX_SEND_HZ;
    this.minSendIntervalMs = Math.max(1, Math.floor(1000 / hz));
  }

  start(): void {
    this.stop();
    if (this.options.canPublish) {
      this.unsubLocal = this.options.subscribeLocalFrame((frame) => {
        void this.publishFrame(frame);
      });
    }
    this.unsubData = this.options.mediaPlane.subscribeLiveActData((message) => {
      if (message.topic !== LIVEACT_NETWORK_TOPIC) return;
      this.onRemotePayload(message.publisherIdentity, message.payload);
    });
  }

  stop(): void {
    this.unsubLocal?.();
    this.unsubLocal = null;
    this.unsubData?.();
    this.unsubData = null;
    for (const [identity, state] of this.remoteByIdentity) {
      this.clearPublisher(identity, state);
    }
    this.remoteByIdentity.clear();
  }

  private async publishFrame(frame: LiveActFrameV1): Promise<void> {
    if (!this.options.canPublish) return;
    const now = this.nowMs();
    if (now - this.lastSendMs < this.minSendIntervalMs) return;
    if (frame.sequence <= this.lastSentSequence && !frame.trackingLost) return;
    const network = encodeLiveActNetworkFrame(frame);
    const ok = await this.options.mediaPlane.publishLiveActData(
      serializeLiveActNetworkFrame(network),
    );
    if (ok) {
      this.lastSendMs = now;
      this.lastSentSequence = frame.sequence;
    }
  }

  private onRemotePayload(publisherIdentity: string, payload: string): void {
    const decoded = parseLiveActNetworkFrameJson(payload);
    if (!decoded.ok) return;

    const characterId = resolveRemoteLiveActCharacterId({
      publisherIdentity,
      rosterByUserId: this.options.getRosterByUserId(),
    });
    if (!characterId) return;

    const output = this.options.getOutputForCharacter(characterId);
    if (!output) return;

    let state =
      this.remoteByIdentity.get(publisherIdentity) ?? createLiveActRemoteConsumerState();
    const accepted = acceptLiveActRemoteFrame({
      state,
      network: decoded.frame,
      liveAct: decoded.liveAct,
      nowWallMs: this.nowMs(),
    });
    this.remoteByIdentity.set(publisherIdentity, accepted.state);

    if (accepted.result.action === 'drop') return;
    if (accepted.result.action === 'neutral') {
      output.resetLiveActPose();
      output.applyLiveActFrame(accepted.result.frame);
      return;
    }
    output.applyLiveActFrame(accepted.result.frame);
  }

  private clearPublisher(
    identity: string,
    state: LiveActRemoteConsumerState,
  ): void {
    const cleared = clearLiveActRemoteConsumer(state);
    const characterId = resolveRemoteLiveActCharacterId({
      publisherIdentity: identity,
      rosterByUserId: this.options.getRosterByUserId(),
    });
    if (!characterId) return;
    const output = this.options.getOutputForCharacter(characterId);
    if (!output) return;
    output.resetLiveActPose();
    if (cleared.result.action === 'neutral' || cleared.result.action === 'apply') {
      output.applyLiveActFrame(cleared.result.frame);
    }
  }
}
