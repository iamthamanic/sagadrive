/**
 * Meshy avatar generation job contracts — pure domain (no React / network / Deno).
 * Location: src/domains/character/avatar/meshy-avatar-job.ts
 *
 * Provider status is never a capability proof — #6 owns capabilities after storage.
 */

export const MESHY_AVATAR_JOB_CONTRACT_VERSION = 'SagaDriveMeshyAvatarJobV1' as const;

export const MESHY_AVATAR_PROMPT_MAX_CHARS = 500;
export const MESHY_AVATAR_PROMPT_MIN_CHARS = 8;
/** Client/server cap for reference image files before base64 (~4 MiB). */
export const MESHY_AVATAR_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const MESHY_AVATAR_IMAGE_PLACEHOLDER_PROMPT = 'Image-to-3D reference';

/**
 * Estimated Meshy credit cost shown before paid start (modal).
 * Text path uses preview-only create; image path defaults to textured Image-to-3D.
 * Provider pricing can change — treat as estimate, not a bill.
 */
export const MESHY_AVATAR_CREDITS_TEXT_PREVIEW = 5;
export const MESHY_AVATAR_CREDITS_IMAGE_TEXTURED = 30;
/** Rough estimate when 4K/8K texture is selected (Meshy pricing can change). */
export const MESHY_AVATAR_CREDITS_IMAGE_TEXTURED_4K = 35;

export type MeshyAvatarGenerationMode = 'text' | 'image';

/** Estimated credits for the selected generation mode (UI confirm modal). */
export function estimateMeshyAvatarCredits(mode: MeshyAvatarGenerationMode): number {
  return mode === 'image'
    ? MESHY_AVATAR_CREDITS_IMAGE_TEXTURED
    : MESHY_AVATAR_CREDITS_TEXT_PREVIEW;
}

export function estimateMeshyAvatarCreditsForSettings(
  mode: MeshyAvatarGenerationMode,
  textureQuality?: string,
): number {
  if (mode !== 'image') return MESHY_AVATAR_CREDITS_TEXT_PREVIEW;
  if (textureQuality === '4k' || textureQuality === '8k') {
    return MESHY_AVATAR_CREDITS_IMAGE_TEXTURED_4K;
  }
  return MESHY_AVATAR_CREDITS_IMAGE_TEXTURED;
}

export type MeshyAvatarJobUiStatus =
  | 'idle'
  | 'confirming'
  | 'queued'
  | 'generating'
  | 'rigging'
  | 'analyzing'
  | 'success'
  | 'failed'
  | 'provider-unavailable';

export type MeshyAvatarJobServerStatus =
  | 'queued'
  | 'generating'
  | 'rigging'
  | 'analyzing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'provider_unavailable';

/** Soft hint for Meshy generation — full provider port lives in rigging-provider-contract (#161). */
export interface MeshyAvatarRiggingHint {
  readonly id: 'meshy' | 'none';
  /** Soft hint only — never elevates AvatarRigCapabilities. */
  requestedRig: boolean;
}

export interface MeshyAvatarJobSnapshot {
  jobId: string;
  status: MeshyAvatarJobUiStatus;
  progress: number;
  prompt: string;
  idempotencyKey: string;
  errorMessage?: string;
  /** Signed model URL after owner-scoped storage materialization. */
  modelUrl?: string;
  /** Always pending/derived from #6 — never from Meshy success alone. */
  rigAnalysisStatus: 'pending' | 'ready' | 'limited' | 'failed' | 'unsupported';
}

export function validateMeshyAvatarPrompt(prompt: string): {
  ok: boolean;
  normalized: string;
  message?: string;
} {
  const normalized = prompt.trim().replace(/\s+/g, ' ');
  if (normalized.length < MESHY_AVATAR_PROMPT_MIN_CHARS) {
    return {
      ok: false,
      normalized,
      message: `Prompt zu kurz (min. ${MESHY_AVATAR_PROMPT_MIN_CHARS} Zeichen).`,
    };
  }
  if (normalized.length > MESHY_AVATAR_PROMPT_MAX_CHARS) {
    return {
      ok: false,
      normalized,
      message: `Prompt zu lang (max. ${MESHY_AVATAR_PROMPT_MAX_CHARS} Zeichen).`,
    };
  }
  return { ok: true, normalized };
}

/** Optional texture guidance for Image-to-3D (look only — not geometry). */
export function validateMeshyAvatarTexturePrompt(prompt: string): {
  ok: boolean;
  normalized: string;
  message?: string;
} {
  const normalized = prompt.trim().replace(/\s+/g, ' ');
  if (!normalized) return { ok: true, normalized: '' };
  if (normalized.length > MESHY_AVATAR_PROMPT_MAX_CHARS) {
    return {
      ok: false,
      normalized,
      message: `Textur-Prompt zu lang (max. ${MESHY_AVATAR_PROMPT_MAX_CHARS} Zeichen).`,
    };
  }
  return { ok: true, normalized };
}

export function validateMeshyAvatarImageDataUri(dataUri: string): {
  ok: boolean;
  normalized: string;
  message?: string;
} {
  const normalized = dataUri.trim();
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(normalized);
  if (!match) {
    return {
      ok: false,
      normalized,
      message: 'Bild muss PNG, JPEG oder WebP als Data-URI sein.',
    };
  }
  const b64 = match[2]!.replace(/\s+/g, '');
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes <= 0) {
    return { ok: false, normalized, message: 'Bild ist leer.' };
  }
  if (approxBytes > MESHY_AVATAR_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      normalized,
      message: `Bild zu groß (max. ${Math.floor(MESHY_AVATAR_IMAGE_MAX_BYTES / (1024 * 1024))} MB).`,
    };
  }
  return { ok: true, normalized: `data:image/${match[1]!.toLowerCase()};base64,${b64}` };
}

export function resolveMeshyAvatarJobPrompt(input: {
  mode: MeshyAvatarGenerationMode;
  prompt: string;
  texturePrompt?: string;
}): { ok: true; prompt: string } | { ok: false; message: string } {
  if (input.mode === 'text') {
    const checked = validateMeshyAvatarPrompt(input.prompt);
    if (!checked.ok) return { ok: false, message: checked.message ?? 'Prompt ungültig.' };
    return { ok: true, prompt: checked.normalized };
  }
  const texture = validateMeshyAvatarTexturePrompt(input.texturePrompt ?? '');
  if (!texture.ok) return { ok: false, message: texture.message ?? 'Textur-Prompt ungültig.' };
  if (texture.normalized.length >= MESHY_AVATAR_PROMPT_MIN_CHARS) {
    return { ok: true, prompt: texture.normalized };
  }
  return { ok: true, prompt: MESHY_AVATAR_IMAGE_PLACEHOLDER_PROMPT };
}

export function buildMeshyAvatarIdempotencyKey(input: {
  ownerUserId: string;
  prompt: string;
  clientNonce: string;
}): string {
  const owner = input.ownerUserId.trim();
  const nonce = input.clientNonce.trim();
  if (!owner || !nonce) throw new Error('Idempotency-Key unvollständig.');
  if (owner.includes('|') || nonce.includes('|')) {
    throw new Error('Ungültige Idempotency-Zeichen.');
  }
  const promptFingerprint = input.prompt.trim().slice(0, 64);
  return `${owner}|${nonce}|${promptFingerprint.length}`;
}

export function mapServerStatusToUi(
  status: MeshyAvatarJobServerStatus,
): MeshyAvatarJobUiStatus {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'generating':
      return 'generating';
    case 'rigging':
      return 'rigging';
    case 'analyzing':
      return 'analyzing';
    case 'succeeded':
      return 'success';
    case 'provider_unavailable':
      return 'provider-unavailable';
    case 'failed':
    case 'canceled':
      return 'failed';
    default:
      return 'failed';
  }
}

/**
 * Capabilities must never be inferred from provider job success.
 * Callers must run #6 analyzeAvatarRigFromObject3D after materialization.
 */
export function assertNoCapabilityFromProviderStatus(
  providerStatus: string,
): 'pending' {
  void providerStatus;
  return 'pending';
}

/** True while preview should show the generating overlay (before model materializes). */
export function isMeshyAvatarJobBusy(status: MeshyAvatarJobUiStatus): boolean {
  return status === 'queued' || status === 'generating' || status === 'rigging';
}

/**
 * Keep UI progress from jumping backwards (Meshy 99% → our rigging 90%).
 * Resets when jobId changes (caller passes peak for previous id separately).
 */
export function monotonicMeshyProgress(previousPeak: number, nextProgress: number): number {
  const prev = Number.isFinite(previousPeak) ? Math.max(0, Math.min(100, Math.round(previousPeak))) : 0;
  const next = Number.isFinite(nextProgress) ? Math.max(0, Math.min(100, Math.round(nextProgress))) : 0;
  return Math.max(prev, next);
}

/** Client poll liveness for the generating overlay. */
export type MeshyAvatarPollHealth = 'idle' | 'connected' | 'waiting' | 'offline';

export const MESHY_AVATAR_POLL_STALE_MS = 8_000;
