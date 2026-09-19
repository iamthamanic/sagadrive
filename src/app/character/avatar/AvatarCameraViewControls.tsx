/**
 * AvatarCameraViewControls — inspect mode + quick camera frames for the 3D preview.
 * Location: src/app/character/avatar/AvatarCameraViewControls.tsx
 *
 * Default orbit stays locked; Untersuchen unlocks pan/closer zoom. Presets jump
 * to body regions (full / portrait / face / feet).
 */
import type { AvatarCameraFrameId } from '../../../infrastructure/character/avatar/character-studio-runtime';
import { Button } from '../../../shared/ui/button';

const FRAMES: ReadonlyArray<{ id: AvatarCameraFrameId; label: string }> = [
  { id: 'full', label: 'Ganzkörper' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'face', label: 'Gesicht' },
  { id: 'feet', label: 'Füße' },
];

interface AvatarCameraViewControlsProps {
  inspectMode: boolean;
  activeFrame: AvatarCameraFrameId | null;
  disabled?: boolean;
  onInspectChange: (enabled: boolean) => void;
  onFrame: (frame: AvatarCameraFrameId) => void;
  onReset: () => void;
}

export function AvatarCameraViewControls({
  inspectMode,
  activeFrame,
  disabled,
  onInspectChange,
  onFrame,
  onReset,
}: AvatarCameraViewControlsProps) {
  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
      data-avatar-camera-controls="true"
      data-avatar-inspect={inspectMode ? 'true' : 'false'}
      role="group"
      aria-label="Kamera-Ansicht"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={inspectMode ? 'default' : 'outline'}
          disabled={disabled}
          aria-pressed={inspectMode}
          onClick={() => onInspectChange(!inspectMode)}
          data-testid="avatar-inspect-toggle"
        >
          {inspectMode ? 'Untersuchen an' : 'Untersuchen'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={onReset}
          data-testid="avatar-camera-reset"
        >
          Zurücksetzen
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Schnellansichten">
        {FRAMES.map((frame) => (
          <Button
            key={frame.id}
            type="button"
            size="sm"
            variant={activeFrame === frame.id ? 'secondary' : 'outline'}
            className="h-7 px-2 text-[11px]"
            disabled={disabled}
            onClick={() => onFrame(frame.id)}
            data-testid={`avatar-camera-frame-${frame.id}`}
          >
            {frame.label}
          </Button>
        ))}
      </div>
      {inspectMode ? (
        <p className="text-[11px] text-muted-foreground" role="status">
          Ziehen = drehen · Rechtsklick/Zwei-Finger = verschieben · Scroll = zoom. So erreichst du Gesicht, Schuhe und Details.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground" role="status">
          Schnellansicht wählen oder „Untersuchen“ für freies Zoomen und Verschieben.
        </p>
      )}
    </div>
  );
}
