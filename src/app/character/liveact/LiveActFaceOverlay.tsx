/**
 * LiveActFaceOverlay — imperative canvas landmark debug over PiP (#331).
 * Location: src/app/character/liveact/LiveActFaceOverlay.tsx
 *
 * Reads diagnostics via ref; rAF draw loop — no React setState per tracking frame.
 */

import { useEffect, useRef, type RefObject } from 'react';
import type {
  LiveActFaceDiagnosticsContours,
  LiveActFaceDiagnosticsFrameV1,
  LiveActFaceLandmark2d,
} from '../../../domains/character/liveact';

interface LiveActFaceOverlayProps {
  enabled: boolean;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly LiveActFaceLandmark2d[],
  width: number,
  height: number,
  mirrorX: boolean,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const xNorm = mirrorX ? 1 - p.x : p.x;
    const x = xNorm * width;
    const y = p.y * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawContours(
  ctx: CanvasRenderingContext2D,
  contours: LiveActFaceDiagnosticsContours,
  width: number,
  height: number,
): void {
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.95)';
  drawPolyline(ctx, contours.faceOval, width, height, true);

  ctx.strokeStyle = 'rgba(96, 165, 250, 0.95)';
  drawPolyline(ctx, contours.leftEye, width, height, true);
  drawPolyline(ctx, contours.rightEye, width, height, true);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
  drawPolyline(ctx, contours.leftEyebrow, width, height, true);
  drawPolyline(ctx, contours.rightEyebrow, width, height, true);

  ctx.strokeStyle = 'rgba(244, 114, 182, 0.95)';
  drawPolyline(ctx, contours.lips, width, height, true);
}

export function LiveActFaceOverlay({ enabled, diagnosticsRef }: LiveActFaceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const tick = (): void => {
      rafRef.current = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = Math.max(1, Math.floor(parent.clientWidth));
      const height = Math.max(1, Math.floor(parent.clientHeight));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const frame = diagnosticsRef.current;
      if (!frame || frame.trackingLost) return;
      drawContours(ctx, frame.contours, width, height);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, diagnosticsRef]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      data-testid="liveact-face-overlay-canvas"
      aria-hidden
    />
  );
}
