/**
 * PlayerAvatarPanel — player-panel surface using shared viewer (#9 / #244).
 * Location: src/app/character/avatar/PlayerAvatarPanel.tsx
 *
 * Live control mode: Face Tracking via shared AvatarFaceTrackingRuntime (same as Editor).
 */

import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import type { AvatarSurfaceRef } from '../../../domains/character/avatar';
import { AvatarSurfaceViewer } from './AvatarSurfaceViewer';

interface PlayerAvatarPanelProps {
  surfaceRef: AvatarSurfaceRef;
  avatar?: CharacterAvatarDto;
}

export function PlayerAvatarPanel({ surfaceRef, avatar }: PlayerAvatarPanelProps) {
  return (
    <section className="space-y-2" aria-label="Spieler-Avatar" data-player-avatar-panel="true">
      <h3 className="text-sm font-medium">{surfaceRef.displayName}</h3>
      <AvatarSurfaceViewer
        surface="player-panel"
        surfaceRef={surfaceRef}
        avatar={avatar}
        size="md"
        enableFaceTracking={Boolean(avatar)}
      />
    </section>
  );
}
