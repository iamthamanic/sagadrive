/**
 * Meshy avatar generation job contracts — pure domain (no React / network / Deno).
 * Location: src/domains/character/avatar/meshy-avatar-job.ts
 *
 * Provider status is never a capability proof — #6 owns capabilities after storage.
 */

export const MESHY_AVATAR_JOB_CONTRACT_VERSION = 'SagaDriveMeshyAvatarJobV1' as const;

export const MESHY_AVATAR_PROMPT_MAX_CHARS = 500;
export const MESHY_AVATAR_PROMPT_MIN_CHARS = 8;

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

/** Provider-neutral rigging port — Meshy result always re-analyzed by #6. */
export interface AvatarRiggingProvider {
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
