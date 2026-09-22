/**
 * LiveActPipMetricsPanel — metrics text beside PiP video (#398/#406 hotfix).
 * Location: src/app/character/liveact/LiveActPipMetricsPanel.tsx
 *
 * Polls diagnostics refs via rAF while visible; keeps numbers off the camera image.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
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
}

interface PipMetricsLines {
  lines: string[];
  lost: boolean;
}

function buildLines(
  frame: LiveActFaceDiagnosticsFrameV1 | null,
  diagnosticsV2: LiveActDiagnosticsV2Snapshot | null,
): PipMetricsLines {
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
  const retargeted = diagnosticsV2?.stages.retargeted;
  if (retargeted) {
    for (const key of ['face.jawOpen', 'face.eyeBlinkLeft', 'face.eyeBlinkRight', 'face.browInnerUp'] as const) {
      const v = retargeted[key];
      if (typeof v === 'number' && v > 0.08) {
        lines.push(`${key.replace('face.', '')}=${v.toFixed(2)}`);
      }
    }
  }
  return { lines, lost: false };
}

export function LiveActPipMetricsPanel({
  active,
  diagnosticsRef,
  diagnosticsV2Ref,
}: LiveActPipMetricsPanelProps) {
  const [view, setView] = useState<PipMetricsLines>({ lines: ['Metrics: —'], lost: false });
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setView({ lines: ['Metrics: —'], lost: false });
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setView(buildLines(diagnosticsRef.current, diagnosticsV2Ref.current));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, diagnosticsRef, diagnosticsV2Ref]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none min-w-[7.5rem] max-w-[9rem] shrink-0 self-stretch overflow-y-auto rounded-md border border-white/10 bg-black/70 px-1.5 py-1 text-[9px] leading-snug text-slate-100"
      data-testid="liveact-pip-metrics-panel"
      aria-hidden
    >
      <ul className={`space-y-0.5 font-mono ${view.lost ? 'text-amber-300' : 'text-slate-100'}`}>
        {view.lines.map((line) => (
          <li key={line} className="truncate" title={line}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
