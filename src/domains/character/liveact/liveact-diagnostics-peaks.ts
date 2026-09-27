/**
 * liveact-diagnostics-peaks — per-stage extremes of Diagnostics V2 snapshots (pure domain).
 * Location: src/domains/character/liveact/liveact-diagnostics-peaks.ts
 *
 * Webcam fidelity audits: repeat an expression, then compare how far each stage got
 * (RAW → MAPPED → SMOOTHED → CALIBRATED → RETARGETED → APPLIED). Numbers only — same
 * local-only contract as Diagnostics V2 (no video, no landmarks).
 */

import {
  LIVEACT_DIAGNOSTICS_V2_STAGES,
  type LiveActAppliedSignalV1,
  type LiveActDiagnosticsV2SignalKey,
  type LiveActDiagnosticsV2Snapshot,
  type LiveActDiagnosticsV2StageId,
} from './liveact-diagnostics-v2';
import { LIVEACT_MIRROR_AVATAR } from './liveact-mediapipe-sample';

export const LIVEACT_DIAGNOSTICS_PEAKS_VERSION = 'SagaDriveLiveActDiagnosticsPeaksV1' as const;

/** Signals whose extremes stay inside ±this are left out of the export (idle channels). */
const EXPORT_MIN_MAGNITUDE = 0.05;

/** [min, max] since the last reset. */
export type LiveActSignalRange = [number, number];

export interface LiveActDiagnosticsPeaksV1 {
  frames: number;
  lastSequence: number | null;
  signals: Partial<
    Record<LiveActDiagnosticsV2SignalKey, Partial<Record<LiveActDiagnosticsV2StageId, LiveActSignalRange>>>
  >;
}

export function createLiveActDiagnosticsPeaks(): LiveActDiagnosticsPeaksV1 {
  return { frames: 0, lastSequence: null, signals: {} };
}

function stageNumber(value: number | null | LiveActAppliedSignalV1 | undefined): number | null {
  const n = typeof value === 'object' && value !== null ? value.value : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * Adds one engine frame (polling the same snapshot twice counts once; tracking-lost frames are
 * skipped). Mutates `peaks`; returns whether the snapshot was counted.
 */
export function accumulateLiveActDiagnosticsPeaks(
  peaks: LiveActDiagnosticsPeaksV1,
  snapshot: LiveActDiagnosticsV2Snapshot,
): boolean {
  if (snapshot.trackingLost || snapshot.sequence === peaks.lastSequence) return false;
  peaks.lastSequence = snapshot.sequence;
  peaks.frames += 1;
  for (const stage of LIVEACT_DIAGNOSTICS_V2_STAGES) {
    const values = snapshot.stages[stage] as Partial<
      Record<LiveActDiagnosticsV2SignalKey, number | null | LiveActAppliedSignalV1>
    >;
    for (const key of Object.keys(values) as LiveActDiagnosticsV2SignalKey[]) {
      const value = stageNumber(values[key]);
      if (value === null) continue;
      const signal = (peaks.signals[key] ??= {});
      const range = signal[stage];
      if (range) {
        range[0] = Math.min(range[0], value);
        range[1] = Math.max(range[1], value);
      } else {
        signal[stage] = [value, value];
      }
    }
  }
  return true;
}

export interface LiveActDiagnosticsPeaksExportV1 {
  contractVersion: typeof LIVEACT_DIAGNOSTICS_PEAKS_VERSION;
  frames: number;
  /** RAW is the user's anatomical side; MAPPED onward is avatar-oriented. */
  avatarMirrored: boolean;
  signals: Partial<
    Record<LiveActDiagnosticsV2SignalKey, Partial<Record<LiveActDiagnosticsV2StageId, LiveActSignalRange>>>
  >;
}

/** Clipboard / report shape: moved signals only, values rounded to 3 decimals. */
export function exportLiveActDiagnosticsPeaks(peaks: LiveActDiagnosticsPeaksV1): LiveActDiagnosticsPeaksExportV1 {
  const round = (v: number): number => Math.round(v * 1000) / 1000;
  const signals: LiveActDiagnosticsPeaksExportV1['signals'] = {};
  for (const key of Object.keys(peaks.signals) as LiveActDiagnosticsV2SignalKey[]) {
    const stages = peaks.signals[key] ?? {};
    const ranges = Object.values(stages) as LiveActSignalRange[];
    if (!ranges.some(([min, max]) => Math.max(Math.abs(min), Math.abs(max)) >= EXPORT_MIN_MAGNITUDE)) continue;
    const out: Partial<Record<LiveActDiagnosticsV2StageId, LiveActSignalRange>> = {};
    for (const stage of LIVEACT_DIAGNOSTICS_V2_STAGES) {
      const range = stages[stage];
      if (range) out[stage] = [round(range[0]), round(range[1])];
    }
    signals[key] = out;
  }
  return {
    contractVersion: LIVEACT_DIAGNOSTICS_PEAKS_VERSION,
    frames: peaks.frames,
    avatarMirrored: LIVEACT_MIRROR_AVATAR,
    signals,
  };
}
