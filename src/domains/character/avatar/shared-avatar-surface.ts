/**
 * Shared avatar surface contract — one viewer model for Library/Sheet/Token/Session/Player (#9).
 * Pure domain: no React, Three, inventory, or free external URL resolution.
 * Location: src/domains/character/avatar/shared-avatar-surface.ts
 */

export const SHARED_AVATAR_SURFACE_CONTRACT_VERSION =
  'SagaDriveSharedAvatarSurfaceV1' as const;

export const AVATAR_RENDER_MODES = ['portrait', 'compact-3d', 'full-3d'] as const;
export type AvatarRenderMode = (typeof AVATAR_RENDER_MODES)[number];

export const AVATAR_SURFACE_IDS = [
  'library',
  'sheet',
  'token',
  'session',
  'player-panel',
] as const;
export type AvatarSurfaceId = (typeof AVATAR_SURFACE_IDS)[number];

/** Soft bound — surfaces must not spawn unbounded WebGL contexts. */
export const AVATAR_SURFACE_MAX_LIVE_3D = 4;

export interface AvatarSurfaceRef {
  characterId: string;
  /** Owner-scoped portrait URL already authorized by persistence. */
  portraitUrl?: string;
  /** Owner-scoped model URL from appearance.avatar.model_url — never free external. */
  modelUrl?: string;
  displayName: string;
  /** Pre-resolved overlays only — viewer must not load inventory. */
  authorizedOverlays?: readonly { instanceId: string; assetKey: string }[];
}

export interface AvatarSurfaceViewModel {
  surface: AvatarSurfaceId;
  mode: AvatarRenderMode;
  characterId: string;
  displayName: string;
  portraitUrl?: string;
  modelUrl?: string;
  allowOrbit: boolean;
  useWebGl: boolean;
  fallbackReason?: string;
}

const DEFAULT_MODE: Record<AvatarSurfaceId, AvatarRenderMode> = {
  library: 'portrait',
  sheet: 'full-3d',
  token: 'portrait',
  session: 'compact-3d',
  'player-panel': 'compact-3d',
};

export function isAvatarRenderMode(value: unknown): value is AvatarRenderMode {
  return typeof value === 'string' && (AVATAR_RENDER_MODES as readonly string[]).includes(value);
}

export function isAvatarSurfaceId(value: unknown): value is AvatarSurfaceId {
  return typeof value === 'string' && (AVATAR_SURFACE_IDS as readonly string[]).includes(value);
}

export function defaultRenderModeForSurface(surface: AvatarSurfaceId): AvatarRenderMode {
  return DEFAULT_MODE[surface];
}

/**
 * Prefer portrait for dense lists; 3d only when model exists and mode requests it.
 * Never invents model URLs — callers pass already-authorized refs.
 */
export function resolveAvatarSurfaceView(input: {
  surface: AvatarSurfaceId;
  ref: AvatarSurfaceRef;
  mode?: AvatarRenderMode;
  webGlAvailable?: boolean;
  live3dCount?: number;
}): AvatarSurfaceViewModel {
  const mode = input.mode ?? defaultRenderModeForSurface(input.surface);
  const portraitUrl =
    typeof input.ref.portraitUrl === 'string' && input.ref.portraitUrl.trim()
      ? input.ref.portraitUrl.trim()
      : undefined;
  const modelUrl =
    typeof input.ref.modelUrl === 'string' && input.ref.modelUrl.trim()
      ? input.ref.modelUrl.trim()
      : undefined;

  const wants3d = mode === 'compact-3d' || mode === 'full-3d';
  const live = input.live3dCount ?? 0;
  const webGlOk = input.webGlAvailable !== false;

  if (!wants3d || !modelUrl || !webGlOk || live >= AVATAR_SURFACE_MAX_LIVE_3D) {
    let fallbackReason: string | undefined;
    if (wants3d && !modelUrl) fallbackReason = 'Kein 3D-Modell — Portrait/Fallback.';
    else if (wants3d && !webGlOk) fallbackReason = 'WebGL nicht verfügbar — Portrait/Fallback.';
    else if (wants3d && live >= AVATAR_SURFACE_MAX_LIVE_3D) {
      fallbackReason = '3D-Limit erreicht — Portrait/Fallback.';
    }
    return {
      surface: input.surface,
      mode: 'portrait',
      characterId: input.ref.characterId,
      displayName: input.ref.displayName,
      portraitUrl,
      modelUrl,
      allowOrbit: false,
      useWebGl: false,
      fallbackReason,
    };
  }

  return {
    surface: input.surface,
    mode,
    characterId: input.ref.characterId,
    displayName: input.ref.displayName,
    portraitUrl,
    modelUrl,
    allowOrbit: mode === 'full-3d' && input.surface === 'sheet',
    useWebGl: true,
  };
}

/** Assert viewer never receives inventory domain objects. */
export function assertNoInventoryInSurfaceRef(ref: AvatarSurfaceRef): void {
  const record = ref as AvatarSurfaceRef & { inventory?: unknown; inventoryV2?: unknown };
  if (record.inventory !== undefined || record.inventoryV2 !== undefined) {
    throw new Error('AvatarSurfaceRef darf keine Inventory-Daten tragen.');
  }
}
