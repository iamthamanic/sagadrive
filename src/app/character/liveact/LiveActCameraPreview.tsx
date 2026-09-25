/**
 * LiveActCameraPreview — mirrored webcam PiP inside the avatar viewport (#330, #398).
 * Location: src/app/character/liveact/LiveActCameraPreview.tsx
 *
 * Engine remains MediaStream owner; this only mirrors via srcObject.
 * Draggable within the viewport; default dock is bottom-left.
 * Metrics sit beside the video (not over the face) when enabled.
 * While calibration or motion test runs, the step instruction is shown on the video.
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type {
  LiveActCalibrationStepPeakV1,
  LiveActDiagnosticsV2Snapshot,
  LiveActFaceDiagnosticsFrameV1,
  LiveActMotionTestStepPeakV1,
  LiveActRangeStepPhase,
  LiveActStatus,
} from '../../../domains/character/liveact';
import {
  formatLiveActMotionTestPeak,
  liveActMotionTestFocusModeForPeak,
} from '../../../domains/character/liveact';
import { Button } from '../../../shared/ui/button';
import { LiveActDiagnosticsPeakControls } from './LiveActDiagnosticsPeakControls';
import { LiveActFaceOverlay } from './LiveActFaceOverlay';
import { LiveActPipMetricsPanel } from './LiveActPipMetricsPanel';

interface LiveActCameraPreviewProps {
  video: HTMLVideoElement | null;
  status: LiveActStatus;
  visible: boolean;
  faceOverlayEnabled: boolean;
  metricsEnabled: boolean;
  fullDetail?: boolean;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
  diagnosticsV2Ref: RefObject<LiveActDiagnosticsV2Snapshot | null>;
  hasNeutralBaseline?: boolean;
  hasRangeCalibration?: boolean;
  calibrationRunning?: boolean;
  calibrationMessage?: string;
  canAdvanceCalibration?: boolean;
  calibrationAdvanceLabelDe?: 'Weiter' | 'Fertig' | null;
  onAdvanceCalibration?: () => void;
  calibrationCountdownSec?: number | null;
  calibrationStepPhase?: LiveActRangeStepPhase | null;
  canStartCalibrationHold?: boolean;
  canRetryCalibrationHold?: boolean;
  calibrationStepPeaks?: readonly LiveActCalibrationStepPeakV1[];
  onStartCalibrationHold?: () => void;
  onRetryCalibrationHold?: () => void;
  canCopyCalibrationAudit?: boolean;
  calibrationPeakFrames?: number;
  getCalibrationAuditJson?: () => string;
  motionTestRunning?: boolean;
  motionTestMessage?: string;
  canAdvanceMotionTest?: boolean;
  motionTestAdvanceLabelDe?: 'Weiter' | 'Fertig' | null;
  onAdvanceMotionTest?: () => void;
  motionTestCountdownSec?: number | null;
  motionTestStepPhase?: LiveActRangeStepPhase | null;
  motionTestStepIndex?: number;
  canStartMotionTestHold?: boolean;
  canRetryMotionTestHold?: boolean;
  motionTestStepPeaks?: readonly LiveActMotionTestStepPeakV1[];
  onStartMotionTestHold?: () => void;
  onRetryMotionTestHold?: () => void;
  canCopyMotionTestAudit?: boolean;
  motionTestPeakFrames?: number;
  getMotionTestAuditJson?: () => string;
}

interface PipPos {
  left: number;
  top: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origLeft: number;
  origTop: number;
}

function clampPipPos(left: number, top: number, el: HTMLElement): PipPos {
  const parent = el.offsetParent as HTMLElement | null;
  if (!parent) return { left, top };
  const maxLeft = Math.max(0, parent.clientWidth - el.offsetWidth);
  const maxTop = Math.max(0, parent.clientHeight - el.offsetHeight);
  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop),
  };
}

export function LiveActCameraPreview({
  video,
  status,
  visible,
  faceOverlayEnabled,
  metricsEnabled,
  fullDetail = false,
  diagnosticsRef,
  diagnosticsV2Ref,
  hasNeutralBaseline = false,
  hasRangeCalibration = false,
  calibrationRunning = false,
  calibrationMessage = '',
  canAdvanceCalibration = false,
  calibrationAdvanceLabelDe = null,
  onAdvanceCalibration,
  calibrationCountdownSec = null,
  calibrationStepPhase = null,
  canStartCalibrationHold = false,
  canRetryCalibrationHold = false,
  calibrationStepPeaks = [],
  onStartCalibrationHold,
  onRetryCalibrationHold,
  canCopyCalibrationAudit = false,
  calibrationPeakFrames = 0,
  getCalibrationAuditJson,
  motionTestRunning = false,
  motionTestMessage = '',
  canAdvanceMotionTest = false,
  motionTestAdvanceLabelDe = null,
  onAdvanceMotionTest,
  motionTestCountdownSec = null,
  motionTestStepPhase = null,
  motionTestStepIndex = 0,
  canStartMotionTestHold = false,
  canRetryMotionTestHold = false,
  motionTestStepPeaks = [],
  onStartMotionTestHold,
  onRetryMotionTestHold,
  canCopyMotionTestAudit = false,
  motionTestPeakFrames = 0,
  getMotionTestAuditJson,
}: LiveActCameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  /** null = CSS default bottom-left; set after first drag or resize clamp */
  const [pos, setPos] = useState<PipPos | null>(null);
  const showMetrics = faceOverlayEnabled && metricsEnabled;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const stream = video?.srcObject;
    if (stream instanceof MediaStream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    } else {
      el.srcObject = null;
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [video, video?.srcObject]);

  // Reset to default dock when PiP hides (next show → bottom-left).
  useEffect(() => {
    if (!visible) {
      setPos(null);
      dragRef.current = null;
    }
  }, [visible]);

  // Keep dragged PiP inside viewport on resize.
  useEffect(() => {
    if (!visible) return;
    const el = rootRef.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) return;

    const reclamp = () => {
      setPos((prev) => (prev ? clampPipPos(prev.left, prev.top, el) : prev));
    };
    const ro = new ResizeObserver(reclamp);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [visible, showMetrics]);

  if (!visible) return null;

  const live =
    status === 'active' || status === 'lost' || status === 'paused' || status === 'starting';

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = rootRef.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) return;

    event.preventDefault();
    event.stopPropagation();

    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const left = elRect.left - parentRect.left;
    const top = elRect.top - parentRect.top;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origLeft: left,
      origTop: top,
    };
    setPos({ left, top });
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = rootRef.current;
    if (!drag || !el || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const next = clampPipPos(
      drag.origLeft + (event.clientX - drag.startX),
      drag.origTop + (event.clientY - drag.startY),
      el,
    );
    setPos(next);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    try {
      rootRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  const guidedRunning = calibrationRunning || motionTestRunning;
  const guidedMessage = calibrationRunning ? calibrationMessage : motionTestMessage;
  const guidedCountdownSec = calibrationRunning ? calibrationCountdownSec : motionTestCountdownSec;
  const guidedStepPhase = calibrationRunning ? calibrationStepPhase : motionTestStepPhase;
  const showGuidedAudit =
    !guidedRunning &&
    ((canCopyCalibrationAudit && getCalibrationAuditJson) ||
      (canCopyMotionTestAudit && getMotionTestAuditJson));

  return (
    <div
      ref={rootRef}
      className={`pointer-events-auto absolute z-20 flex max-w-[min(92%,22rem)] cursor-grab items-stretch gap-1.5 rounded-md border border-white/15 bg-[#09111F]/90 p-1 shadow-lg active:cursor-grabbing touch-none ${
        pos ? '' : 'bottom-3 left-3'
      }`}
      style={pos ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' } : undefined}
      data-testid="liveact-camera-pip"
      data-liveact-camera-pip="true"
      data-liveact-camera-pip-draggable="true"
      role="group"
      aria-label="Kameravorschau — ziehen zum Verschieben"
      aria-hidden={!live}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="relative w-[min(42vw,11rem)] shrink-0 overflow-hidden rounded-sm aspect-[4/3]">
        <video
          ref={videoRef}
          className="pointer-events-none h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          muted
          playsInline
          autoPlay
        />
        <LiveActFaceOverlay
          enabled={faceOverlayEnabled}
          metricsEnabled={false}
          fullDetail={fullDetail}
          diagnosticsRef={diagnosticsRef}
          diagnosticsV2Ref={diagnosticsV2Ref}
          videoRef={videoRef}
        />
        <div className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-slate-100">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === 'active' ? 'bg-emerald-400' : status === 'lost' ? 'bg-amber-400' : 'bg-slate-400'
            }`}
          />
          {status === 'active' ? 'LIVE' : status === 'starting' ? '…' : status === 'lost' ? 'LOST' : 'CAM'}
        </div>
        {guidedRunning && guidedMessage ? (
          <div
            className="absolute inset-x-1 bottom-1 flex flex-col gap-1 rounded bg-black/75 px-1.5 py-1"
            data-testid={calibrationRunning ? 'liveact-calibration-prompt' : 'liveact-motion-test-prompt'}
            role="status"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <p className="pointer-events-none text-[10px] font-medium leading-tight text-amber-200">
              {guidedMessage}
            </p>
            {typeof guidedCountdownSec === 'number' && guidedStepPhase === 'holding' ? (
              <p
                className="pointer-events-none text-center text-3xl font-semibold tabular-nums leading-none text-amber-100"
                data-testid={
                  calibrationRunning
                    ? 'liveact-calibration-countdown'
                    : 'liveact-motion-test-countdown'
                }
                aria-live="polite"
              >
                {guidedCountdownSec}
              </p>
            ) : null}
            {calibrationRunning &&
            calibrationStepPhase === 'review' &&
            calibrationStepPeaks.length > 0 ? (
              <ul
                className="pointer-events-none space-y-0.5 text-[10px] tabular-nums text-emerald-200"
                data-testid="liveact-calibration-step-peaks"
              >
                {calibrationStepPeaks.map((peak) => (
                  <li key={peak.channel} className="flex justify-between gap-2">
                    <span className="truncate text-slate-300">{peak.channel}</span>
                    <span className="font-semibold">{peak.max.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {motionTestRunning &&
            motionTestStepPhase === 'review' &&
            motionTestStepPeaks.length > 0 ? (
              <ul
                className="pointer-events-none space-y-0.5 text-[10px] tabular-nums text-emerald-200"
                data-testid="liveact-motion-test-step-peaks"
              >
                {motionTestStepPeaks.map((peak) => (
                  <li key={peak.key} className="flex justify-between gap-2">
                    <span className="truncate text-slate-300">{peak.key}</span>
                    <span className="font-semibold">
                      {formatLiveActMotionTestPeak(
                        peak,
                        liveActMotionTestFocusModeForPeak(motionTestStepIndex, peak.key),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-1">
              {canStartCalibrationHold ? (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-6 flex-1 text-[10px]"
                  data-testid="liveact-calibrate-start-pip"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartCalibrationHold?.();
                  }}
                >
                  Start
                </Button>
              ) : null}
              {canRetryCalibrationHold ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 flex-1 border-white/20 text-[10px]"
                  data-testid="liveact-calibrate-retry-pip"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRetryCalibrationHold?.();
                  }}
                >
                  Wiederholen
                </Button>
              ) : null}
              {canAdvanceCalibration ? (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-6 flex-1 text-[10px]"
                  data-testid="liveact-calibrate-advance-pip"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAdvanceCalibration?.();
                  }}
                >
                  {calibrationAdvanceLabelDe ?? 'Weiter'}
                </Button>
              ) : null}
              {canStartMotionTestHold ? (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-6 flex-1 text-[10px]"
                  data-testid="liveact-motion-test-start-pip"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartMotionTestHold?.();
                  }}
                >
                  Start
                </Button>
              ) : null}
              {canRetryMotionTestHold ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 flex-1 border-white/20 text-[10px]"
                  data-testid="liveact-motion-test-retry-pip"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRetryMotionTestHold?.();
                  }}
                >
                  Wiederholen
                </Button>
              ) : null}
              {canAdvanceMotionTest ? (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-6 flex-1 text-[10px]"
                  data-testid="liveact-motion-test-advance-pip"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAdvanceMotionTest?.();
                  }}
                >
                  {motionTestAdvanceLabelDe ?? 'Weiter'}
                </Button>
              ) : null}
            </div>
          </div>
        ) : showGuidedAudit ? (
          <div
            className="absolute inset-x-1 bottom-1 rounded bg-black/75 px-1 py-0.5"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {canCopyCalibrationAudit && getCalibrationAuditJson ? (
              <LiveActDiagnosticsPeakControls
                frames={calibrationPeakFrames}
                getExportJson={getCalibrationAuditJson}
                showReset={false}
                framesLabel="Messwerte"
                testId="liveact-calibration-audit-pip"
              />
            ) : null}
            {canCopyMotionTestAudit && getMotionTestAuditJson ? (
              <LiveActDiagnosticsPeakControls
                frames={motionTestPeakFrames}
                getExportJson={getMotionTestAuditJson}
                showReset={false}
                framesLabel="Motion Test"
                testId="liveact-motion-test-audit-pip"
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <LiveActPipMetricsPanel
        active={showMetrics}
        diagnosticsRef={diagnosticsRef}
        diagnosticsV2Ref={diagnosticsV2Ref}
        hasNeutralBaseline={hasNeutralBaseline}
        hasRangeCalibration={hasRangeCalibration}
      />
    </div>
  );
}
