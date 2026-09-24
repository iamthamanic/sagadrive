/**
 * AvatarPreviewExpandDialog — large modal 3D preview framed on the face.
 * Location: src/app/character/avatar/AvatarPreviewExpandDialog.tsx
 *
 * Opened from AvatarPreviewSettings „Setup“ control.
 * Same gear chrome as the editor viewport so LiveAct / Face Setup stay reachable.
 */

import { useRef, useState } from 'react';
import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import type { LiveActCapabilitiesV1 } from '../../../domains/character/liveact';
import type { SagaDriveFaceAnchorsManifestV1 } from '../../../domains/character/avatar';
import type { CharacterStudioRuntime } from '../../../infrastructure/character/avatar/character-studio-runtime';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import { LiveActViewportControls } from '../liveact/LiveActViewportControls';
import type { UseLiveActViewportResult } from '../liveact/useLiveActViewport';
import { AvatarCanvas } from './AvatarCanvas';

interface AvatarPreviewExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatar: CharacterAvatarDto | null;
  displayName?: string;
  liveAct: UseLiveActViewportResult;
  capabilities: LiveActCapabilitiesV1 | null;
  characterFaceMappingAvailable: boolean;
  onFaceAnchorsCommitted?: (manifest: SagaDriveFaceAnchorsManifestV1) => void;
}

export function AvatarPreviewExpandDialog({
  open,
  onOpenChange,
  avatar,
  displayName,
  liveAct,
  capabilities,
  characterFaceMappingAvailable,
  onFaceAnchorsCommitted,
}: AvatarPreviewExpandDialogProps) {
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [mtoonEnabled, setMtoonEnabled] = useState(true);
  const mtoonHandlerRef = useRef<((enabled: boolean) => void) | null>(null);
  const studioRuntimeRef = useRef<CharacterStudioRuntime | null>(null);
  const [faceMappingPanelHost, setFaceMappingPanelHost] = useState<HTMLDivElement | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setRuntimeReady(false);
          mtoonHandlerRef.current = null;
          studioRuntimeRef.current = null;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[min(92vh,56rem)] w-[min(96vw,42rem)] max-w-none flex-col gap-3 overflow-y-auto p-4 sm:max-w-none"
        data-testid="avatar-preview-expand-dialog"
      >
        <DialogHeader>
          <DialogTitle>3D Setup</DialogTitle>
          <DialogDescription>
            {displayName
              ? `${displayName} — Gesicht-Kamerarahmen. Einstellungen über das Zahnrad.`
              : 'Gesicht-Kamerarahmen. Einstellungen über das Zahnrad.'}
          </DialogDescription>
        </DialogHeader>

        {avatar ? (
          <div className="relative w-full" data-testid="avatar-preview-expand-viewport">
            <AvatarCanvas
              avatar={avatar}
              controlMode="editor"
              hideMtoonToggle
              hideEditorFaceTrackingBar
              initialCameraFrame="face"
              className="relative flex w-full flex-col gap-2"
              studioRuntimeRef={studioRuntimeRef}
              onRuntimeReady={() => setRuntimeReady(true)}
              onMtoonState={(enabled, apply) => {
                setMtoonEnabled(enabled);
                mtoonHandlerRef.current = apply;
              }}
              belowViewportSlot={
                <div
                  ref={setFaceMappingPanelHost}
                  className="w-full empty:hidden"
                  data-testid="face-mapping-panel-host-expand"
                  data-avatar-below-viewport="true"
                />
              }
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-[4/5] w-full"
              data-avatar-viewport-chrome="expand"
            >
              <div className="pointer-events-none relative h-full w-full">
                <LiveActViewportControls
                  runtimeReady={runtimeReady}
                  mtoonEnabled={mtoonEnabled}
                  onMtoonChange={(enabled) => {
                    mtoonHandlerRef.current?.(enabled);
                    setMtoonEnabled(enabled);
                  }}
                  liveAct={liveAct}
                  capabilities={capabilities}
                  characterFaceMappingAvailable={characterFaceMappingAvailable}
                  studioRuntimeRef={studioRuntimeRef}
                  faceMappingPanelHost={faceMappingPanelHost}
                  onFaceAnchorsCommitted={onFaceAnchorsCommitted}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full" data-testid="avatar-preview-expand-fallback-host">
            <div
              className="flex aspect-[4/5] w-full items-center justify-center rounded-lg border border-border bg-muted/40 px-4 text-center text-sm text-muted-foreground"
              data-testid="avatar-preview-expand-fallback"
              data-avatar-surface-fallback="true"
            >
              Kein 3D-Modell geladen — Portrait/Fallback.
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-[4/5] w-full">
              <div className="pointer-events-none relative h-full w-full">
                <LiveActViewportControls
                  runtimeReady={false}
                  mtoonEnabled={mtoonEnabled}
                  onMtoonChange={setMtoonEnabled}
                  liveAct={liveAct}
                  capabilities={null}
                  characterFaceMappingAvailable={false}
                  onFaceAnchorsCommitted={onFaceAnchorsCommitted}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
