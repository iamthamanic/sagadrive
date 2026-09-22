/**
 * LiveActCameraPreview — mirrored webcam PiP inside the avatar viewport (#330, #398).
 * Location: src/app/character/liveact/LiveActCameraPreview.tsx
 *
 * Engine remains MediaStream owner; this only mirrors via srcObject.
 * Draggable within the viewport; default dock is bottom-left.
 * Metrics sit beside the video (not over the face) when enabled.
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type {
  LiveActDiagnosticsV2Snapshot,
  LiveActFaceDiagnosticsFrameV1,
  LiveActStatus,
} from '../../../domains/character/liveact';
import { LiveActFaceOverlay } from './LiveActFaceOverlay';
import { LiveActPipMetricsPanel } from './LiveActPipMetricsPanel';

interface LiveActCameraPreviewProps {
  video: HTMLVideoElement | null;
  status: LiveActStatus;
  visible: boolean;
  faceOverlayEnabled: boolean;
  metricsEnabled: boolean;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
  diagnosticsV2Ref: RefObject<LiveActDiagnosticsV2Snapshot | null>;
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
  diagnosticsRef,
  diagnosticsV2Ref,
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
      </div>
      <LiveActPipMetricsPanel
        active={showMetrics}
        diagnosticsRef={diagnosticsRef}
        diagnosticsV2Ref={diagnosticsV2Ref}
      />
    </div>
  );
}
