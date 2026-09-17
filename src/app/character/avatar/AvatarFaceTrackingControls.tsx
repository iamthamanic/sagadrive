/**
 * AvatarFaceTrackingControls — optional local webcam Face Tracking start/stop (#12).
 * Location: src/app/character/avatar/AvatarFaceTrackingControls.tsx
 *
 * Off by default; browser permission only after explicit Start. Privacy copy visible.
 */

import type { FaceTrackingStatus } from '../../../domains/character/avatar';

interface AvatarFaceTrackingControlsProps {
  status: FaceTrackingStatus;
  message: string;
  fpsCap: number;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function AvatarFaceTrackingControls({
  status,
  message,
  fpsCap,
  disabled,
  onStart,
  onStop,
}: AvatarFaceTrackingControlsProps) {
  const active =
    status === 'active' || status === 'starting' || status === 'paused' || status === 'lost';

  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
      data-avatar-face-tracking-status={status}
      role="group"
      aria-label="Avatar Face Tracking"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Face Tracking</p>
        {active ? (
          <button
            type="button"
            className="min-h-11 rounded border border-border bg-background px-2.5 py-1 font-medium hover:border-accent"
            data-avatar-face-tracking-stop
            disabled={disabled}
            onClick={onStop}
            aria-label="Face Tracking stoppen"
          >
            Stoppen
          </button>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded border border-primary bg-primary px-2.5 py-1 font-medium text-primary-foreground"
            data-avatar-face-tracking-start
            disabled={disabled}
            onClick={onStart}
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
        Lokal im Browser · keine Video-/Landmark-Speicherung · max. {fpsCap} FPS
      </p>
    </div>
  );
}
