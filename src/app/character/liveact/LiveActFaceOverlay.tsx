/**
 * LiveActFaceOverlay — imperative canvas landmark debug over PiP (#331, #398).
 * Location: src/app/character/liveact/LiveActFaceOverlay.tsx
 *
 * Projects landmarks via VideoViewportTransform (object-cover + single mirror).
 * Default: named contours only. Full Detail: every MediaPipe landmark (+ iris highlight).
 * Optional metrics HUD; rAF draw loop — no React setState per tracking frame.
 */

import { useEffect, useRef, type RefObject } from 'react';
import {
  computeLiveActFaceMetrics,
  computeLiveActObjectCoverTransform,
  createEmptyLiveActFaceDiagnosticsFrame,
  formatLiveActMetric,
  liveActRadiansToDegrees,
  projectLiveActLandmarkToCanvas,
  type LiveActDiagnosticsV2Snapshot,
  type LiveActFaceDiagnosticsContours,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActFaceLandmark2d,
  type LiveActVideoViewportTransform,
} from '../../../domains/character/liveact';

/** MediaPipe Face Mesh iris landmark range (indices 468–477). */
const IRIS_LANDMARK_START = 468;
const IRIS_LANDMARK_END = 478;

interface LiveActFaceOverlayProps {
  enabled: boolean;
  metricsEnabled: boolean;
  /** Draw all tracking landmarks as dots (not only contours). */
  fullDetail?: boolean;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
  diagnosticsV2Ref: RefObject<LiveActDiagnosticsV2Snapshot | null>;
  /** PiP <video> element for intrinsic size (object-cover source). */
  videoRef: RefObject<HTMLVideoElement | null>;
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly LiveActFaceLandmark2d[],
  transform: LiveActVideoViewportTransform,
  closed: boolean,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const { x, y } = projectLiveActLandmarkToCanvas(p.x, p.y, transform);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
}

function drawContours(
  ctx: CanvasRenderingContext2D,
  contours: LiveActFaceDiagnosticsContours,
  transform: LiveActVideoViewportTransform,
): void {
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.95)';
  drawPolyline(ctx, contours.faceOval, transform, true);

  ctx.strokeStyle = 'rgba(96, 165, 250, 0.95)';
  drawPolyline(ctx, contours.leftEye, transform, true);
  drawPolyline(ctx, contours.rightEye, transform, true);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
  drawPolyline(ctx, contours.leftEyebrow, transform, false);
  drawPolyline(ctx, contours.rightEyebrow, transform, false);

  ctx.strokeStyle = 'rgba(244, 114, 182, 0.95)';
  drawPolyline(ctx, contours.lips, transform, true);
}

function drawAllLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: readonly LiveActFaceLandmark2d[],
  transform: LiveActVideoViewportTransform,
): void {
  for (let i = 0; i < landmarks.length; i += 1) {
    const p = landmarks[i];
    if (!p) continue;
    const { x, y } = projectLiveActLandmarkToCanvas(p.x, p.y, transform);
    const iris = i >= IRIS_LANDMARK_START && i < IRIS_LANDMARK_END;
    ctx.fillStyle = iris ? 'rgba(250, 204, 21, 0.95)' : 'rgba(226, 232, 240, 0.55)';
    ctx.beginPath();
    ctx.arc(x, y, iris ? 2.25 : 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMetricsHud(
  ctx: CanvasRenderingContext2D,
  frame: LiveActFaceDiagnosticsFrameV1,
  diagnosticsV2: LiveActDiagnosticsV2Snapshot | null,
  width: number,
  fullDetail: boolean,
): void {
  const metrics = computeLiveActFaceMetrics(frame.landmarks);
  const lines: string[] = [];

  if (frame.trackingLost || !metrics.available) {
    lines.push('Metrics: LOST');
  } else {
    const yaw = diagnosticsV2?.stages.calibrated['head.yaw'];
    const pitch = diagnosticsV2?.stages.calibrated['head.pitch'];
    const roll = diagnosticsV2?.stages.calibrated['head.roll'];
    const bbox = metrics.bbox;
    lines.push(
      bbox
        ? `bbox ${bbox.minX.toFixed(2)}–${bbox.maxX.toFixed(2)} × ${bbox.minY.toFixed(2)}–${bbox.maxY.toFixed(2)}`
        : 'bbox —',
    );
    lines.push(
      `yaw ${yaw == null ? '—' : liveActRadiansToDegrees(yaw).toFixed(0)}°  pitch ${
        pitch == null ? '—' : liveActRadiansToDegrees(pitch).toFixed(0)
      }°  roll ${roll == null ? '—' : liveActRadiansToDegrees(roll).toFixed(0)}°`,
    );
    lines.push(`mouthGap ${formatLiveActMetric(metrics.mouthGap)}`);
    lines.push(
      `eyeOpen L ${formatLiveActMetric(metrics.eyeOpenLeft)}  R ${formatLiveActMetric(metrics.eyeOpenRight)}`,
    );
    lines.push(
      `browLift L ${formatLiveActMetric(metrics.browLiftLeft)}  R ${formatLiveActMetric(metrics.browLiftRight)}`,
    );
    if (fullDetail) {
      lines.push(`landmarks ${frame.landmarks.length} (iris gelb)`);
    }

    const retargeted = diagnosticsV2?.stages.retargeted;
    if (retargeted) {
      const active: string[] = [];
      for (const key of [
        'face.jawOpen',
        'face.eyeBlinkLeft',
        'face.eyeBlinkRight',
        'face.browInnerUp',
      ] as const) {
        const v = retargeted[key];
        if (typeof v === 'number' && v > 0.08) {
          active.push(`${key.replace('face.', '')}=${v.toFixed(2)}`);
        }
      }
      if (active.length) lines.push(active.join('  '));
    }
  }

  const pad = 4;
  const lineH = 11;
  const boxH = pad * 2 + lines.length * lineH;
  const boxW = Math.min(width - 8, 200);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(4, width > 0 ? 22 : 4, boxW, boxH);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], 8, 22 + pad + i * lineH, boxW - 8);
  }
}

export function LiveActFaceOverlay({
  enabled,
  metricsEnabled,
  fullDetail = false,
  diagnosticsRef,
  diagnosticsV2Ref,
  videoRef,
}: LiveActFaceOverlayProps) {
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
      if (!frame || frame.trackingLost) {
        if (metricsEnabled) {
          const lost =
            frame ??
            createEmptyLiveActFaceDiagnosticsFrame({ timestampMs: 0, sequence: 0 });
          drawMetricsHud(
            ctx,
            { ...lost, trackingLost: true },
            diagnosticsV2Ref.current,
            width,
            fullDetail,
          );
        }
        return;
      }

      const video = videoRef.current;
      const videoWidth = video?.videoWidth || width;
      const videoHeight = video?.videoHeight || height;
      const transform = computeLiveActObjectCoverTransform({
        videoWidth,
        videoHeight,
        canvasWidth: width,
        canvasHeight: height,
        mirrorX: true,
      });

      if (fullDetail) {
        drawAllLandmarks(ctx, frame.landmarks, transform);
      }
      drawContours(ctx, frame.contours, transform);
      if (metricsEnabled) {
        drawMetricsHud(ctx, frame, diagnosticsV2Ref.current, width, fullDetail);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, metricsEnabled, fullDetail, diagnosticsRef, diagnosticsV2Ref, videoRef]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      data-testid="liveact-face-overlay-canvas"
      data-full-detail={fullDetail ? 'true' : 'false'}
      aria-hidden
    />
  );
}
