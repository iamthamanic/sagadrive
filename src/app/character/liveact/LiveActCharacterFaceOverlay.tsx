/**
 * LiveActCharacterFaceOverlay — mesh-bound face debug over avatar viewport (#400).
 * Location: src/app/character/liveact/LiveActCharacterFaceOverlay.tsx
 *
 * Samples deformed SagaDriveFaceAnchorsV1 via CharacterStudioRuntime handle; rAF only.
 * Geometry metrics + key APPLIED channels (not a 1:1 webcam ratio comparison).
 */

import { useEffect, useRef, type RefObject } from 'react';
import {
  formatLiveActMetric,
  type LiveActDiagnosticsV2Snapshot,
} from '../../../domains/character/liveact';
import type { LiveActCharacterFaceDebugHandle } from '../../../infrastructure/character/avatar/character-studio-runtime';
import type { LiveActCharacterFaceDebugContours } from '../../../infrastructure/character/liveact/liveact-character-face-debug';

interface LiveActCharacterFaceOverlayProps {
  enabled: boolean;
  metricsEnabled: boolean;
  debugHandleRef: RefObject<LiveActCharacterFaceDebugHandle | null>;
  diagnosticsV2Ref?: RefObject<LiveActDiagnosticsV2Snapshot | null>;
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  closed: boolean,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
}

function drawContours(
  ctx: CanvasRenderingContext2D,
  contours: LiveActCharacterFaceDebugContours,
): void {
  ctx.lineWidth = 1.35;
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.92)';
  drawPolyline(ctx, contours.lips, true);

  ctx.strokeStyle = 'rgba(96, 165, 250, 0.95)';
  drawPolyline(ctx, contours.leftEye, true);
  drawPolyline(ctx, contours.rightEye, true);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
  drawPolyline(ctx, contours.leftEyebrow, false);
  drawPolyline(ctx, contours.rightEyebrow, false);
}

function drawMetricsHud(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  width: number,
): void {
  const pad = 4;
  const lineH = 11;
  const boxH = pad * 2 + lines.length * lineH;
  const boxW = Math.min(width - 8, 210);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(4, 4, boxW, boxH);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], 8, pad + i * lineH, boxW - 8);
  }
}

function appliedValue(
  diagnosticsV2: LiveActDiagnosticsV2Snapshot | null,
  key: 'face.jawOpen' | 'face.eyeBlinkLeft' | 'face.eyeBlinkRight' | 'face.browInnerUp',
): number | null {
  const signal = diagnosticsV2?.stages.applied?.[key];
  if (!signal || signal.status === 'unavailable') return null;
  if (typeof signal.value !== 'number' || !Number.isFinite(signal.value)) return null;
  return signal.value;
}

export function LiveActCharacterFaceOverlay({
  enabled,
  metricsEnabled,
  debugHandleRef,
  diagnosticsV2Ref,
}: LiveActCharacterFaceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const tick = (): void => {
      rafRef.current = requestAnimationFrame(tick);
      const handle = debugHandleRef.current;
      const canvas = canvasRef.current;
      if (!handle || !canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = Math.max(1, Math.floor(parent.clientWidth));
      const height = Math.max(1, Math.floor(parent.clientHeight));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      handle.sample();
      const snap = handle.snapshot;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      if (!snap.available || !snap.contours) {
        if (metricsEnabled) {
          drawMetricsHud(ctx, ['Character metrics: —'], width);
        }
        return;
      }

      drawContours(ctx, snap.contours);

      if (metricsEnabled) {
        const m = snap.metrics;
        const lines: string[] = [];
        if (!m.available) {
          lines.push('Character metrics: —');
        } else {
          lines.push('Character geometry');
          const bbox = m.bbox;
          lines.push(
            bbox
              ? `bbox ${bbox.minX.toFixed(2)}–${bbox.maxX.toFixed(2)} × ${bbox.minY.toFixed(2)}–${bbox.maxY.toFixed(2)}`
              : 'bbox —',
          );
          lines.push(`mouthGap ${formatLiveActMetric(m.mouthGap)}`);
          lines.push(
            `eyeOpen L ${formatLiveActMetric(m.eyeOpenLeft)}  R ${formatLiveActMetric(m.eyeOpenRight)}`,
          );
          lines.push(
            `browLift L ${formatLiveActMetric(m.browLiftLeft)}  R ${formatLiveActMetric(m.browLiftRight)}`,
          );
          const d2 = diagnosticsV2Ref?.current ?? null;
          const jaw = appliedValue(d2, 'face.jawOpen');
          const blinkL = appliedValue(d2, 'face.eyeBlinkLeft');
          const blinkR = appliedValue(d2, 'face.eyeBlinkRight');
          const brow = appliedValue(d2, 'face.browInnerUp');
          lines.push('Applied');
          lines.push(`jawOpen ${jaw == null ? '—' : jaw.toFixed(2)}`);
          lines.push(`blinkL ${blinkL == null ? '—' : blinkL.toFixed(2)}  blinkR ${blinkR == null ? '—' : blinkR.toFixed(2)}`);
          lines.push(`browInnerUp ${brow == null ? '—' : brow.toFixed(2)}`);
        }
        drawMetricsHud(ctx, lines, width);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, metricsEnabled, debugHandleRef, diagnosticsV2Ref]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      data-testid="liveact-character-face-overlay-canvas"
      aria-hidden
    />
  );
}
