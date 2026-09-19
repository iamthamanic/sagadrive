/**
 * AvatarSurfaceViewer — shared portrait / compact-3d / full-3d host for #9.
 * Location: src/app/character/avatar/AvatarSurfaceViewer.tsx
 *
 * No inventory resolution. Falls back to portrait without layout jump.
 * Live 3D count is bounded via resolveAvatarSurfaceView.
 */

import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import {
  resolveAvatarSurfaceView,
  type AvatarRenderMode,
  type AvatarSurfaceId,
  type AvatarSurfaceRef,
} from '../../../domains/character/avatar';
import { AvatarCanvas, type AvatarPortraitCaptureHandle } from './AvatarCanvas';

interface AvatarSurfaceViewerProps {
  surface: AvatarSurfaceId;
  surfaceRef: AvatarSurfaceRef;
  /** Required when mode resolves to WebGL — compact appearance avatar DTO. */
  avatar?: CharacterAvatarDto;
  mode?: AvatarRenderMode;
  live3dCount?: number;
  className?: string;
  canvasRef?: RefObject<HTMLCanvasElement>;
  captureApiRef?: MutableRefObject<AvatarPortraitCaptureHandle | null>;
  onRuntimeReady?: () => void;
  /** Portrait/list density — fixed aspect box to avoid layout jump. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = {
  sm: 'h-14 w-14',
  md: 'aspect-[4/5] w-full min-h-[12rem]',
  lg: 'aspect-[4/5] w-full min-h-[18rem]',
} as const;

function detectWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function AvatarSurfaceViewer({
  surface,
  surfaceRef,
  avatar,
  mode,
  live3dCount = 0,
  className,
  canvasRef,
  captureApiRef,
  onRuntimeReady,
  size = 'md',
}: AvatarSurfaceViewerProps) {
  const [webGlAvailable, setWebGlAvailable] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    setWebGlAvailable(detectWebGl());
  }, []);

  const view = resolveAvatarSurfaceView({
    surface,
    ref: surfaceRef,
    mode,
    webGlAvailable,
    live3dCount,
  });

  const boxClass = SIZE_CLASS[size];
  const show3d = view.useWebGl && Boolean(avatar);
  // 3D canvas owns its own aspect + controls below; don't lock the outer box to 4/5
  // or Animation/Facial panels steal height from the character viewport.
  const shellClass = show3d
    ? `relative w-full ${className ?? ''}`
    : `relative overflow-hidden rounded-lg border border-border bg-[#0B1220] ${boxClass} ${className ?? ''}`;

  return (
    <div
      className={shellClass}
      data-avatar-surface={view.surface}
      data-avatar-render-mode={view.mode}
      data-avatar-use-webgl={view.useWebGl ? 'true' : 'false'}
      aria-label={`Avatar ${view.displayName}`}
    >
      {show3d && avatar ? (
        <AvatarCanvas
          avatar={avatar}
          canvasRef={canvasRef}
          captureApiRef={captureApiRef}
          onRuntimeReady={onRuntimeReady}
          className="relative flex w-full flex-col gap-2"
        />
      ) : view.portraitUrl && !imageFailed ? (
        <img
          src={view.portraitUrl}
          alt={`Portrait von ${view.displayName}`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-muted/40 px-2 text-center text-xs text-muted-foreground"
          data-avatar-surface-fallback="true"
        >
          {view.displayName.slice(0, 2).toUpperCase()}
        </div>
      )}
      {view.fallbackReason && show3d === false ? (
        <span className="sr-only">{view.fallbackReason}</span>
      ) : null}
    </div>
  );
}
