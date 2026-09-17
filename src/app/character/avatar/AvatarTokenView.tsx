/**
 * AvatarTokenView — token-context portrait surface using shared viewer (#9).
 * Location: src/app/character/avatar/AvatarTokenView.tsx
 */

import type { AvatarSurfaceRef } from '../../../domains/character/avatar';
import { AvatarSurfaceViewer } from './AvatarSurfaceViewer';

interface AvatarTokenViewProps {
  surfaceRef: AvatarSurfaceRef;
  className?: string;
}

export function AvatarTokenView({ surfaceRef, className }: AvatarTokenViewProps) {
  return (
    <AvatarSurfaceViewer
      surface="token"
      surfaceRef={surfaceRef}
      size="sm"
      className={className}
      data-avatar-token="true"
    />
  );
}
