/**
 * Avatar rigging provider contract — Meshy + SkinTokens (#161).
 * Pure domain: provider success never elevates #6 capabilities.
 * Location: src/domains/character/avatar/rigging-provider-contract.ts
 */

export const RIGGING_PROVIDER_CONTRACT_VERSION = 'SagaDriveAvatarRiggingProviderV1' as const;

export const RIGGING_PROVIDER_IDS = ['meshy', 'skintokens'] as const;
export type AvatarRiggingProviderId = (typeof RIGGING_PROVIDER_IDS)[number];

export const RIGGING_MODES = ['full-rig', 'existing-skeleton-skinning'] as const;
export type AvatarRiggingMode = (typeof RIGGING_MODES)[number];

export const RIGGING_JOB_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'unavailable',
  'needs-review',
] as const;
export type AvatarRiggingJobStatus = (typeof RIGGING_JOB_STATUSES)[number];

export interface AvatarRiggingSubmitInput {
  /** Logical owner-scoped asset key — never a free URL. */
  sourceAssetKey: string;
  mode: AvatarRiggingMode;
  provider: AvatarRiggingProviderId;
  ownerUserId: string;
  clientNonce: string;
}

export interface AvatarRiggingJobSnapshot {
  jobId: string;
  provider: AvatarRiggingProviderId;
  mode: AvatarRiggingMode;
  status: AvatarRiggingJobStatus;
  progress: number;
  /** Materialized owner-scoped GLB key after success — still pending #6. */
  outputAssetKey?: string;
  errorMessageDe?: string;
  /** Always pending until #6 — never from provider success. */
  rigAnalysisStatus: 'pending';
}

export interface AvatarRiggingProvider {
  readonly id: AvatarRiggingProviderId;
  isAvailable(): boolean | Promise<boolean>;
  submit(input: AvatarRiggingSubmitInput): Promise<AvatarRiggingJobSnapshot>;
  getStatus(jobId: string): Promise<AvatarRiggingJobSnapshot>;
}

const MODEL3D_PREFIX = 'model3d:';

export function assertLogicalRiggingAssetKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed.startsWith(MODEL3D_PREFIX) || trimmed.length <= MODEL3D_PREFIX.length) {
    throw new Error('Rigging akzeptiert nur logische model3d:-Asset-Keys.');
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('://')) {
    throw new Error('Freie URLs sind für Rigging verboten.');
  }
  return trimmed;
}

export function buildRiggingIdempotencyKey(input: {
  ownerUserId: string;
  sourceAssetKey: string;
  provider: AvatarRiggingProviderId;
  mode: AvatarRiggingMode;
  clientNonce: string;
}): string {
  const owner = input.ownerUserId.trim();
  const nonce = input.clientNonce.trim();
  if (!owner || !nonce) throw new Error('Idempotency unvollständig.');
  assertLogicalRiggingAssetKey(input.sourceAssetKey);
  return `${owner}|${input.provider}|${input.mode}|${nonce}|${input.sourceAssetKey.length}`;
}

/** Provider success must never invent capabilities — #6 owns analysis. */
export function assertRiggingCapabilitiesPending(providerStatus: string): 'pending' {
  void providerStatus;
  return 'pending';
}

export function createMockMeshyRiggingProvider(): AvatarRiggingProvider {
  const jobs = new Map<string, AvatarRiggingJobSnapshot>();
  return {
    id: 'meshy',
    isAvailable: () => true,
    async submit(input) {
      assertLogicalRiggingAssetKey(input.sourceAssetKey);
      const jobId = `meshy-rig-${input.clientNonce}`;
      const snapshot: AvatarRiggingJobSnapshot = {
        jobId,
        provider: 'meshy',
        mode: input.mode,
        status: 'succeeded',
        progress: 100,
        outputAssetKey: `${input.sourceAssetKey}-rigged`,
        rigAnalysisStatus: assertRiggingCapabilitiesPending('succeeded'),
      };
      jobs.set(jobId, snapshot);
      return snapshot;
    },
    async getStatus(jobId) {
      const job = jobs.get(jobId);
      if (!job) {
        return {
          jobId,
          provider: 'meshy',
          mode: 'full-rig',
          status: 'failed',
          progress: 0,
          errorMessageDe: 'Job nicht gefunden.',
          rigAnalysisStatus: 'pending',
        };
      }
      return { ...job, rigAnalysisStatus: 'pending' };
    },
  };
}

/**
 * SkinTokens/TokenRig — optional self-host. Default mock marks unavailable
 * unless `SKINTOKENS_AVAILABLE=1` is simulated via option.
 */
export function createMockSkinTokensRiggingProvider(options?: {
  available?: boolean;
  supportExistingSkeleton?: boolean;
}): AvatarRiggingProvider {
  const available = options?.available === true;
  const supportExisting = options?.supportExistingSkeleton === true;
  const jobs = new Map<string, AvatarRiggingJobSnapshot>();
  return {
    id: 'skintokens',
    isAvailable: () => available,
    async submit(input) {
      assertLogicalRiggingAssetKey(input.sourceAssetKey);
      const jobId = `skintokens-rig-${input.clientNonce}`;
      if (!available) {
        const snapshot: AvatarRiggingJobSnapshot = {
          jobId,
          provider: 'skintokens',
          mode: input.mode,
          status: 'unavailable',
          progress: 0,
          errorMessageDe: 'SkinTokens-Worker nicht verfügbar.',
          rigAnalysisStatus: 'pending',
        };
        jobs.set(jobId, snapshot);
        return snapshot;
      }
      if (input.mode === 'existing-skeleton-skinning' && !supportExisting) {
        const snapshot: AvatarRiggingJobSnapshot = {
          jobId,
          provider: 'skintokens',
          mode: input.mode,
          status: 'unavailable',
          progress: 0,
          errorMessageDe: 'existing-skeleton-skinning experimentell nicht aktiv.',
          rigAnalysisStatus: 'pending',
        };
        jobs.set(jobId, snapshot);
        return snapshot;
      }
      const snapshot: AvatarRiggingJobSnapshot = {
        jobId,
        provider: 'skintokens',
        mode: input.mode,
        status: 'needs-review',
        progress: 100,
        outputAssetKey: `${input.sourceAssetKey}-skintokens`,
        errorMessageDe: 'Skinweights unsicher — Review nötig.',
        rigAnalysisStatus: assertRiggingCapabilitiesPending('succeeded'),
      };
      jobs.set(jobId, snapshot);
      return snapshot;
    },
    async getStatus(jobId) {
      const job = jobs.get(jobId);
      if (!job) {
        return {
          jobId,
          provider: 'skintokens',
          mode: 'full-rig',
          status: 'failed',
          progress: 0,
          errorMessageDe: 'Job nicht gefunden.',
          rigAnalysisStatus: 'pending',
        };
      }
      return { ...job, rigAnalysisStatus: 'pending' };
    },
  };
}

/** V1: prefer Meshy when available; SkinTokens only when explicitly available. */
export function selectDefaultRiggingProvider(input: {
  meshyAvailable: boolean;
  skintokensAvailable: boolean;
}): AvatarRiggingProviderId {
  if (input.meshyAvailable) return 'meshy';
  if (input.skintokensAvailable) return 'skintokens';
  return 'meshy';
}
