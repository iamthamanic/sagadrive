/**
 * LiveAct motion test — sequential webcam fidelity evidence (pure domain).
 * Location: src/domains/character/liveact/liveact-motion-test.ts
 *
 * Same Start → hold → review → Weiter UX as range calibration, but read-only:
 * never writes neutral baseline or range gains. Per-step focus peaks plus a
 * full Diagnostics V2 peak export become clipboard evidence after Fertig.
 */

import type {
  LiveActAppliedSignalV1,
  LiveActDiagnosticsV2SignalKey,
  LiveActDiagnosticsV2Snapshot,
} from './liveact-diagnostics-v2';
import {
  exportLiveActDiagnosticsPeaks,
  type LiveActDiagnosticsPeaksExportV1,
  type LiveActDiagnosticsPeaksV1,
} from './liveact-diagnostics-peaks';
import { LIVEACT_MIRROR_AVATAR } from './liveact-mediapipe-sample';
import type { LiveActRangeStepPhase } from './liveact-calibration';

/** Read a Diagnostics V2 number from raw or calibrated (applied wraps `{ value }`). */
export function readLiveActMotionTestSignal(
  snapshot: LiveActDiagnosticsV2Snapshot,
  key: LiveActDiagnosticsV2SignalKey,
  stage: 'raw' | 'calibrated',
): number | null {
  if (snapshot.trackingLost) return null;
  const values = snapshot.stages[stage] as Partial<
    Record<LiveActDiagnosticsV2SignalKey, number | null | LiveActAppliedSignalV1>
  >;
  const raw = values[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && typeof raw.value === 'number' && Number.isFinite(raw.value)) {
    return raw.value;
  }
  return null;
}

export const LIVEACT_MOTION_TEST_CONTRACT =
  'SagaDriveLiveActMotionTestV1' as const;

/** Minimum hold frames before a step can complete (~0.7 s at 30 fps). */
export const LIVEACT_MOTION_TEST_MIN_FRAMES = 20 as const;

export type LiveActMotionTestFocusMode = 'range' | 'max' | 'absMax';

export interface LiveActMotionTestFocusV1 {
  /** Diagnostics V2 signal key (e.g. head.yaw, face.eyeBlinkLeft). */
  key: LiveActDiagnosticsV2SignalKey;
  /**
   * Stage to sample during the hold.
   * RAW = anatomical side; calibrated = after neutral/range (what you see on the avatar).
   */
  stage: 'raw' | 'calibrated';
  mode: LiveActMotionTestFocusMode;
}

export interface LiveActMotionTestStepV1 {
  id: string;
  labelDe: string;
  holdDe: string;
  holdMs: number;
  focus: readonly LiveActMotionTestFocusV1[];
}

/**
 * Ordered retest of head axes, L/R blink, gaze, and key mouth channels.
 * Keep short enough for a live session; lips coverage is representative, not full cal.
 */
export const LIVEACT_MOTION_TEST_STEPS = [
  {
    id: 'neutral',
    labelDe: 'Neutral halten',
    holdDe: 'entspannt, Blick geradeaus',
    holdMs: 3000,
    focus: [
      { key: 'head.yaw', stage: 'calibrated', mode: 'absMax' },
      { key: 'head.pitch', stage: 'calibrated', mode: 'absMax' },
      { key: 'head.roll', stage: 'calibrated', mode: 'absMax' },
      { key: 'eyeLeft.x', stage: 'calibrated', mode: 'absMax' },
      { key: 'eyeLeft.y', stage: 'calibrated', mode: 'absMax' },
    ],
  },
  {
    id: 'yawLeft',
    labelDe: 'Kopf nach links',
    holdDe: 'zur linken Schulter drehen',
    holdMs: 3000,
    focus: [{ key: 'head.yaw', stage: 'calibrated', mode: 'range' }],
  },
  {
    id: 'yawRight',
    labelDe: 'Kopf nach rechts',
    holdDe: 'zur rechten Schulter drehen',
    holdMs: 3000,
    focus: [{ key: 'head.yaw', stage: 'calibrated', mode: 'range' }],
  },
  {
    id: 'pitchDown',
    labelDe: 'Kopf nicken runter',
    holdDe: 'Kinn zur Brust',
    holdMs: 3000,
    focus: [{ key: 'head.pitch', stage: 'calibrated', mode: 'range' }],
  },
  {
    id: 'pitchUp',
    labelDe: 'Kopf nicken hoch',
    holdDe: 'Kinn hoch',
    holdMs: 3000,
    focus: [{ key: 'head.pitch', stage: 'calibrated', mode: 'range' }],
  },
  {
    id: 'roll',
    labelDe: 'Kopf kippen',
    holdDe: 'Ohr zur Schulter (eine Seite reicht)',
    holdMs: 3000,
    focus: [{ key: 'head.roll', stage: 'calibrated', mode: 'range' }],
  },
  {
    id: 'blinkLeft',
    labelDe: 'Nur linkes Auge zu',
    holdDe: 'dein linkes Auge zu, rechtes offen (einseitiger L/R-Check)',
    holdMs: 3000,
    focus: [
      { key: 'face.eyeBlinkLeft', stage: 'raw', mode: 'max' },
      { key: 'face.eyeBlinkRight', stage: 'raw', mode: 'max' },
      { key: 'face.eyeBlinkLeft', stage: 'calibrated', mode: 'max' },
      { key: 'face.eyeBlinkRight', stage: 'calibrated', mode: 'max' },
    ],
  },
  {
    // Many people cannot close only the right eye — both-closed is the bilateral check.
    id: 'blinkBoth',
    labelDe: 'Beide Augen fest zu',
    holdDe: 'beide Augen schließen und halten',
    holdMs: 3000,
    focus: [
      { key: 'face.eyeBlinkLeft', stage: 'raw', mode: 'max' },
      { key: 'face.eyeBlinkRight', stage: 'raw', mode: 'max' },
      { key: 'face.eyeBlinkLeft', stage: 'calibrated', mode: 'max' },
      { key: 'face.eyeBlinkRight', stage: 'calibrated', mode: 'max' },
    ],
  },
  {
    id: 'gazeLeft',
    labelDe: 'Blick nach links',
    holdDe: 'Augen nach links, Kopf still',
    holdMs: 3000,
    focus: [
      { key: 'eyeLeft.x', stage: 'calibrated', mode: 'range' },
      { key: 'eyeRight.x', stage: 'calibrated', mode: 'range' },
    ],
  },
  {
    id: 'gazeUp',
    labelDe: 'Blick nach oben',
    holdDe: 'Augen nach oben, Kopf still',
    holdMs: 3000,
    focus: [
      { key: 'eyeLeft.y', stage: 'calibrated', mode: 'range' },
      { key: 'eyeRight.y', stage: 'calibrated', mode: 'range' },
    ],
  },
  {
    id: 'jawOpen',
    labelDe: 'Mund weit auf',
    holdDe: 'kräftig öffnen und halten',
    holdMs: 3000,
    focus: [{ key: 'face.jawOpen', stage: 'calibrated', mode: 'max' }],
  },
  {
    id: 'smile',
    labelDe: 'Breit lächeln',
    holdDe: 'kräftig halten',
    holdMs: 3000,
    focus: [
      { key: 'face.mouthSmileLeft', stage: 'calibrated', mode: 'max' },
      { key: 'face.mouthSmileRight', stage: 'calibrated', mode: 'max' },
    ],
  },
  {
    id: 'pucker',
    labelDe: 'Kussmund',
    holdDe: 'Lippen spitzen und halten',
    holdMs: 3000,
    focus: [{ key: 'face.mouthPucker', stage: 'calibrated', mode: 'max' }],
  },
  {
    id: 'funnel',
    labelDe: 'Starkes O',
    holdDe: 'rundes O halten',
    holdMs: 3000,
    focus: [{ key: 'face.mouthFunnel', stage: 'calibrated', mode: 'max' }],
  },
] as const satisfies ReadonlyArray<LiveActMotionTestStepV1>;

export type LiveActMotionTestStepId = (typeof LIVEACT_MOTION_TEST_STEPS)[number]['id'];

export type LiveActMotionTestStatus = 'idle' | 'running' | 'success' | 'cancelled';

export interface LiveActMotionTestStepPeakV1 {
  /** Display key: signal + stage, e.g. face.eyeBlinkLeft@raw */
  key: string;
  signal: LiveActDiagnosticsV2SignalKey;
  stage: 'raw' | 'calibrated';
  min: number;
  max: number;
}

export interface LiveActMotionTestStepResultV1 {
  id: LiveActMotionTestStepId | string;
  labelDe: string;
  holdMs: number;
  peaks: readonly LiveActMotionTestStepPeakV1[];
}

export interface LiveActMotionTestExportV1 {
  contractVersion: typeof LIVEACT_MOTION_TEST_CONTRACT;
  avatarMirrored: boolean;
  hasNeutralBaseline: boolean;
  hasRangeCalibration: boolean;
  steps: readonly LiveActMotionTestStepResultV1[];
  /** Full-session Diagnostics V2 peaks (all signals that moved). */
  sessionPeaks: LiveActDiagnosticsPeaksExportV1;
}

export function liveActMotionTestStepTotal(): number {
  return LIVEACT_MOTION_TEST_STEPS.length;
}

export function liveActMotionTestHoldMs(stepIndex: number): number {
  return LIVEACT_MOTION_TEST_STEPS[stepIndex]?.holdMs ?? 3000;
}

export function liveActMotionTestStepPrompt(stepIndex: number): string {
  const steps = LIVEACT_MOTION_TEST_STEPS;
  const total = liveActMotionTestStepTotal();
  const step = steps[stepIndex];
  if (!step) return `Motion Test ${total}/${total}: Fertig`;
  const seconds = Math.round(step.holdMs / 1000);
  return `Motion ${stepIndex + 1}/${total}: ${step.labelDe} — ${step.holdDe} (${seconds} s)`;
}

export function liveActMotionTestAdvanceLabelDe(
  stepIndex: number,
): 'Weiter' | 'Fertig' {
  return stepIndex >= LIVEACT_MOTION_TEST_STEPS.length - 1 ? 'Fertig' : 'Weiter';
}

/** Mutable per-focus extremes while holding. */
export type LiveActMotionTestHoldAcc = Partial<
  Record<string, { signal: LiveActDiagnosticsV2SignalKey; stage: 'raw' | 'calibrated'; min: number; max: number }>
>;

export function createLiveActMotionTestHoldAcc(): LiveActMotionTestHoldAcc {
  return {};
}

export function motionTestFocusStorageKey(
  focus: LiveActMotionTestFocusV1,
): string {
  return `${focus.key}@${focus.stage}`;
}

/**
 * Push one sample into the hold accumulator for the step's focus keys.
 * Ignores non-finite values; does not require a valid face (caller gates tracking).
 */
export function pushLiveActMotionTestHoldSample(
  acc: LiveActMotionTestHoldAcc,
  stepIndex: number,
  read: (key: LiveActDiagnosticsV2SignalKey, stage: 'raw' | 'calibrated') => number | null,
): void {
  const step = LIVEACT_MOTION_TEST_STEPS[stepIndex];
  if (!step) return;
  for (const focus of step.focus) {
    const value = read(focus.key, focus.stage);
    if (value === null || !Number.isFinite(value)) continue;
    const storageKey = motionTestFocusStorageKey(focus);
    const prev = acc[storageKey];
    if (prev) {
      prev.min = Math.min(prev.min, value);
      prev.max = Math.max(prev.max, value);
    } else {
      acc[storageKey] = {
        signal: focus.key,
        stage: focus.stage,
        min: value,
        max: value,
      };
    }
  }
}

export function finalizeLiveActMotionTestStepPeaks(
  acc: LiveActMotionTestHoldAcc,
  stepIndex: number,
): LiveActMotionTestStepPeakV1[] {
  const step = LIVEACT_MOTION_TEST_STEPS[stepIndex];
  if (!step) return [];
  const round = (v: number): number => Math.round(v * 1000) / 1000;
  return step.focus.map((focus) => {
    const storageKey = motionTestFocusStorageKey(focus);
    const range = acc[storageKey];
    const min = range?.min ?? 0;
    const max = range?.max ?? 0;
    return {
      key: storageKey,
      signal: focus.key,
      stage: focus.stage,
      min: round(min),
      max: round(max),
    };
  });
}

/** Format a peak for PiP / settings: absMax shows one number, range shows min…max. */
export function formatLiveActMotionTestPeak(
  peak: LiveActMotionTestStepPeakV1,
  mode: LiveActMotionTestFocusMode,
): string {
  if (mode === 'absMax') {
    return Math.max(Math.abs(peak.min), Math.abs(peak.max)).toFixed(2);
  }
  if (mode === 'max') {
    return peak.max.toFixed(2);
  }
  return `${peak.min.toFixed(2)}…${peak.max.toFixed(2)}`;
}

export function liveActMotionTestFocusModeForPeak(
  stepIndex: number,
  peakKey: string,
): LiveActMotionTestFocusMode {
  const step = LIVEACT_MOTION_TEST_STEPS[stepIndex];
  const focus = step?.focus.find((f) => motionTestFocusStorageKey(f) === peakKey);
  return focus?.mode ?? 'range';
}

export function buildLiveActMotionTestExport(input: {
  stepResults: readonly LiveActMotionTestStepResultV1[];
  sessionPeaks: LiveActDiagnosticsPeaksV1;
  hasNeutralBaseline: boolean;
  hasRangeCalibration: boolean;
}): LiveActMotionTestExportV1 {
  return {
    contractVersion: LIVEACT_MOTION_TEST_CONTRACT,
    avatarMirrored: LIVEACT_MIRROR_AVATAR,
    hasNeutralBaseline: input.hasNeutralBaseline,
    hasRangeCalibration: input.hasRangeCalibration,
    steps: input.stepResults,
    sessionPeaks: exportLiveActDiagnosticsPeaks(input.sessionPeaks),
  };
}

export type { LiveActRangeStepPhase };
