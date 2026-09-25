/**
 * LiveActPipMetricsPanel — metrics text beside PiP video (#398/#406 hotfix).
 * Location: src/app/character/liveact/LiveActPipMetricsPanel.tsx
 *
 * Polls diagnostics refs via rAF while visible; keeps numbers off the camera image.
 * Updates DOM text via ref (no setState per tracking frame).
 */

import { useEffect, useRef, type RefObject } from 'react';
import {
  computeLiveActFaceMetrics,
  formatLiveActMetric,
  liveActRadiansToDegrees,
  type LiveActDiagnosticsV2Snapshot,
  type LiveActFaceDiagnosticsFrameV1,
} from '../../../domains/character/liveact';

interface LiveActPipMetricsPanelProps {
  active: boolean;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
  diagnosticsV2Ref: RefObject<LiveActDiagnosticsV2Snapshot | null>;
  hasNeutralBaseline?: boolean;
  hasRangeCalibration?: boolean;
}

function calibrationLine(hasNeutralBaseline: boolean, hasRangeCalibration: boolean): string {
  if (!hasNeutralBaseline) return 'cal: OFF (Kalibrieren)';
  return hasRangeCalibration ? 'cal: neutral+max' : 'cal: neutral';
}

function buildLines(
  frame: LiveActFaceDiagnosticsFrameV1 | null,
  diagnosticsV2: LiveActDiagnosticsV2Snapshot | null,
  hasNeutralBaseline: boolean,
  hasRangeCalibration: boolean,
): { lines: string[]; lost: boolean } {
  if (!frame || frame.trackingLost) {
    return { lines: ['Metrics: LOST'], lost: true };
  }
  const metrics = computeLiveActFaceMetrics(frame.landmarks);
  if (!metrics.available) {
    return { lines: ['Metrics: LOST'], lost: true };
  }
  const yaw = diagnosticsV2?.stages.calibrated['head.yaw'];
  const pitch = diagnosticsV2?.stages.calibrated['head.pitch'];
  const roll = diagnosticsV2?.stages.calibrated['head.roll'];
  const bbox = metrics.bbox;
  const lines: string[] = [
    calibrationLine(hasNeutralBaseline, hasRangeCalibration),
    bbox
      ? `bbox ${bbox.minX.toFixed(2)}–${bbox.maxX.toFixed(2)} × ${bbox.minY.toFixed(2)}–${bbox.maxY.toFixed(2)}`
      : 'bbox —',
    `yaw ${yaw == null ? '—' : liveActRadiansToDegrees(yaw).toFixed(0)}°`,
    `pitch ${pitch == null ? '—' : liveActRadiansToDegrees(pitch).toFixed(0)}°`,
    `roll ${roll == null ? '—' : liveActRadiansToDegrees(roll).toFixed(0)}°`,
    `mouth ${formatLiveActMetric(metrics.mouthGap)}`,
    `eye L ${formatLiveActMetric(metrics.eyeOpenLeft)} R ${formatLiveActMetric(metrics.eyeOpenRight)}`,
    `brow L ${formatLiveActMetric(metrics.browLiftLeft)} R ${formatLiveActMetric(metrics.browLiftRight)}`,
  ];
  // Landmark metrics above are the user's own sides; retargeted channels are the avatar's
  // (mirrored: the user's left blink is the avatar's eyeBlinkRight).
  const retargeted = diagnosticsV2?.stages.retargeted;
  if (retargeted) {
    for (const key of ['face.jawOpen', 'face.eyeBlinkLeft', 'face.eyeBlinkRight', 'face.browInnerUp'] as const) {
      const v = retargeted[key];
      if (typeof v === 'number' && v > 0.08) {
        lines.push(`Avatar ${key.replace('face.', '')}=${v.toFixed(2)}`);
      }
    }
  }
  return { lines, lost: false };
}

export function LiveActPipMetricsPanel({
  active,
  diagnosticsRef,
  diagnosticsV2Ref,
  hasNeutralBaseline = false,
  hasRangeCalibration = false,
}: LiveActPipMetricsPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      const list = listRef.current;
      if (list) list.replaceChildren();
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const { lines, lost } = buildLines(
        diagnosticsRef.current,
        diagnosticsV2Ref.current,
        hasNeutralBaseline,
        hasRangeCalibration,
      );
      const list = listRef.current;
      if (list) {
        list.className = `space-y-0.5 font-mono ${lost ? 'text-amber-300' : 'text-slate-100'}`;
        while (list.childElementCount > lines.length) {
          list.removeChild(list.lastChild!);
        }
        for (let i = 0; i < lines.length; i += 1) {
          let li = list.children[i] as HTMLLIElement | undefined;
          if (!li) {
            li = document.createElement('li');
            li.className = 'truncate';
            list.appendChild(li);
          }
          if (li.textContent !== lines[i]) {
            li.textContent = lines[i];
            li.title = lines[i];
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, diagnosticsRef, diagnosticsV2Ref, hasNeutralBaseline, hasRangeCalibration]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none min-w-[7.5rem] max-w-[9rem] shrink-0 self-stretch overflow-y-auto rounded-md border border-white/10 bg-black/70 px-1.5 py-1 text-[9px] leading-snug text-slate-100"
      data-testid="liveact-pip-metrics-panel"
      aria-hidden
    >
      <ul ref={listRef} className="space-y-0.5 font-mono text-slate-100" />
    </div>
  );
}
