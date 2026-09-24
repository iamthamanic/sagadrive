/**
 * AvatarPreviewExpandDialog — large modal 3D preview framed on the face.
 * Location: src/app/character/avatar/AvatarPreviewExpandDialog.tsx
 *
 * Opened from AvatarPreviewSettings „3D Vorschau“ expand control.
 * Loads the same editor avatar in Gesicht camera mode (not LiveAct tracking).
 */

import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import { AvatarCanvas } from './AvatarCanvas';

interface AvatarPreviewExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatar: CharacterAvatarDto | null;
  displayName?: string;
}

export function AvatarPreviewExpandDialog({
  open,
  onOpenChange,
  avatar,
  displayName,
}: AvatarPreviewExpandDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,56rem)] w-[min(96vw,42rem)] max-w-none flex-col gap-3 overflow-y-auto p-4 sm:max-w-none"
        data-testid="avatar-preview-expand-dialog"
      >
        <DialogHeader>
          <DialogTitle>3D Vorschau</DialogTitle>
          <DialogDescription>
            {displayName
              ? `${displayName} — Gesicht-Kamerarahmen. Orbit und Zoom wie in der Editor-Vorschau.`
              : 'Gesicht-Kamerarahmen. Orbit und Zoom wie in der Editor-Vorschau.'}
          </DialogDescription>
        </DialogHeader>

        {avatar ? (
          <AvatarCanvas
            avatar={avatar}
            controlMode="editor"
            hideMtoonToggle
            hideEditorFaceTrackingBar
            initialCameraFrame="face"
            className="relative flex w-full flex-col gap-2"
          />
        ) : (
          <div
            className="flex aspect-[4/5] w-full items-center justify-center rounded-lg border border-border bg-muted/40 px-4 text-center text-sm text-muted-foreground"
            data-testid="avatar-preview-expand-fallback"
            data-avatar-surface-fallback="true"
          >
            Kein 3D-Modell geladen — Portrait/Fallback.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
