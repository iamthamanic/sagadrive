/**
 * SessionAvatarStrip — session surface using shared viewer (bounded 3D) (#9).
 * Location: src/app/session/SessionAvatarStrip.tsx
 */

import { useMemo } from 'react';
import type { AvatarSurfaceRef } from '../../domains/character/avatar';
import { AVATAR_SURFACE_MAX_LIVE_3D } from '../../domains/character/avatar';
import { AvatarSurfaceViewer } from '../character';

interface SessionAvatarStripProps {
  characters: readonly AvatarSurfaceRef[];
}

export function SessionAvatarStrip({ characters }: SessionAvatarStripProps) {
  const limited = useMemo(() => characters.slice(0, AVATAR_SURFACE_MAX_LIVE_3D + 8), [characters]);

  if (limited.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-session-avatar-empty="true">
        Noch keine Session-Charaktere.
      </p>
    );
  }

  return (
    <ul
      className="flex flex-wrap gap-2"
      aria-label="Session-Avatare"
      data-session-avatar-strip="true"
    >
      {limited.map((ref, index) => (
        <li key={ref.characterId} className="w-16 shrink-0 space-y-1">
          <AvatarSurfaceViewer
            surface="session"
            surfaceRef={ref}
            size="sm"
            live3dCount={index}
          />
          <p className="truncate text-[10px] text-muted-foreground">{ref.displayName}</p>
        </li>
      ))}
    </ul>
  );
}
