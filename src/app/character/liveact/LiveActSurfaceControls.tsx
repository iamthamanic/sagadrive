/**
 * LiveActSurfaceControls — compact Player/Session LiveAct start/stop (#334).
 * Location: src/app/character/liveact/LiveActSurfaceControls.tsx
 *
 * Same shared LiveActEngine as Editor gear; no viewport PiP/calibration on live surfaces.
 */

import type { UseLiveActViewportResult } from './useLiveActViewport';

interface LiveActSurfaceControlsProps {
  liveAct: UseLiveActViewportResult;
  disabled?: boolean;
}

export function LiveActSurfaceControls({ liveAct, disabled }: LiveActSurfaceControlsProps) {
  const { status, message, fpsCap, qualityProfileLabelDe, trackingEnabled, setTrackingEnabled } =
    liveAct;

  const active =
    status === 'active' || status === 'starting' || status === 'paused' || status === 'lost';

  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
      data-liveact-surface-controls="true"
      data-avatar-face-tracking-status={status}
      data-avatar-face-tracking-profile={qualityProfileLabelDe}
      role="group"
      aria-label="Avatar LiveAct"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Face Tracking</p>
        {active || trackingEnabled ? (
          <button
            type="button"
            className="min-h-11 rounded border border-border bg-background px-2.5 py-1 font-medium hover:border-accent"
            data-avatar-face-tracking-stop
            data-liveact-surface-stop
            disabled={disabled}
            onClick={() => setTrackingEnabled(false)}
            aria-label="Face Tracking stoppen"
          >
            Stoppen
          </button>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded border border-primary bg-primary px-2.5 py-1 font-medium text-primary-foreground"
            data-avatar-face-tracking-start
            data-liveact-surface-start
            disabled={disabled}
            onClick={() => setTrackingEnabled(true)}
            aria-label="Face Tracking starten"
          >
            Face Tracking starten
          </button>
        )}
      </div>
      <p className="text-muted-foreground" data-avatar-face-tracking-message role="status">
        {message}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Lokal im Browser · keine Video-/Landmark-Speicherung · Profil{' '}
        <span data-avatar-face-tracking-profile-label>{qualityProfileLabelDe}</span> · max.{' '}
        {fpsCap} FPS
      </p>
    </div>
  );
}
