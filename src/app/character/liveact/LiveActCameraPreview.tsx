/**
 * LiveActCameraPreview — mirrored webcam PiP inside the avatar viewport (#330).
 * Location: src/app/character/liveact/LiveActCameraPreview.tsx
 *
 * Engine remains MediaStream owner; this only mirrors via srcObject. Not draggable.
 */

import { useEffect, useRef } from 'react';
import type { LiveActStatus } from '../../../domains/character/liveact';

interface LiveActCameraPreviewProps {
  video: HTMLVideoElement | null;
  status: LiveActStatus;
  visible: boolean;
}

export function LiveActCameraPreview({ video, status, visible }: LiveActCameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

  if (!visible) return null;

  const live =
    status === 'active' || status === 'lost' || status === 'paused' || status === 'starting';

  return (
    <div
      className="pointer-events-none absolute right-3 top-12 z-20 w-[min(42%,11rem)] overflow-hidden rounded-md border border-white/15 bg-[#09111F]/90 shadow-lg aspect-[4/3]"
      data-testid="liveact-camera-pip"
      data-liveact-camera-pip="true"
      aria-hidden={!live}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        muted
        playsInline
        autoPlay
      />
      <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-slate-100">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === 'active' ? 'bg-emerald-400' : status === 'lost' ? 'bg-amber-400' : 'bg-slate-400'
          }`}
        />
        {status === 'active' ? 'LIVE' : status === 'starting' ? '…' : status === 'lost' ? 'LOST' : 'CAM'}
      </div>
    </div>
  );
}
