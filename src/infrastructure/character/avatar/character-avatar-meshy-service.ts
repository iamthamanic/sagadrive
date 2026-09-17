/**
 * character-avatar-meshy-service — client facade for Meshy avatar generation (#10).
 * Invokes Edge Function only; never embeds Meshy secrets.
 * Location: src/infrastructure/character/avatar/character-avatar-meshy-service.ts
 */

import { supabase } from '../../../lib/supabase';
import {
  MESHY_AVATAR_PROMPT_MAX_CHARS,
  MESHY_AVATAR_PROMPT_MIN_CHARS,
  assertNoCapabilityFromProviderStatus,
  mapServerStatusToUi,
  validateMeshyAvatarPrompt,
  type MeshyAvatarJobServerStatus,
  type MeshyAvatarJobSnapshot,
  type MeshyAvatarJobUiStatus,
} from '../../../domains/character/avatar/meshy-avatar-job';

export interface MeshyAvatarConfig {
  meshyConfigured: boolean;
  promptMinChars: number;
  promptMaxChars: number;
  costHintDe: string;
}

type FunctionResponse =
  | { status: 'ok' } & Record<string, unknown>
  | { status: 'not-configured'; message: string }
  | { status: 'error'; message: string; code?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseResponse(value: unknown): FunctionResponse {
  if (!isRecord(value) || typeof value.status !== 'string') {
    return { status: 'error', message: 'Ungültige Serverantwort.' };
  }
  if (value.status === 'ok') return value as FunctionResponse;
  if (
    (value.status === 'not-configured' || value.status === 'error') &&
    typeof value.message === 'string'
  ) {
    return {
      status: value.status,
      message: value.message,
      code: typeof value.code === 'string' ? value.code : undefined,
    };
  }
  return { status: 'error', message: 'Ungültige Serverantwort.' };
}

function mapJob(raw: Record<string, unknown>, modelUrl?: string): MeshyAvatarJobSnapshot {
  const serverStatus = (typeof raw.status === 'string' ? raw.status : 'failed') as MeshyAvatarJobServerStatus;
  const uiStatus: MeshyAvatarJobUiStatus = mapServerStatusToUi(serverStatus);
  return {
    jobId: typeof raw.id === 'string' ? raw.id : '',
    status: uiStatus,
    progress: typeof raw.progress === 'number' ? raw.progress : 0,
    prompt: typeof raw.prompt === 'string' ? raw.prompt : '',
    idempotencyKey: typeof raw.idempotency_key === 'string' ? raw.idempotency_key : '',
    errorMessage: typeof raw.error_message === 'string' ? raw.error_message : undefined,
    modelUrl,
    rigAnalysisStatus: assertNoCapabilityFromProviderStatus(serverStatus),
  };
}

async function invoke(body: Record<string, unknown>): Promise<FunctionResponse> {
  const { data, error } = await supabase.functions.invoke('character-avatar-meshy', { body });
  if (error) {
    return { status: 'error', message: error.message || 'Edge Function fehlgeschlagen.' };
  }
  return parseResponse(data);
}

export async function fetchMeshyAvatarConfig(): Promise<MeshyAvatarConfig> {
  const response = await invoke({ action: 'config' });
  if (response.status !== 'ok') {
    return {
      meshyConfigured: false,
      promptMinChars: MESHY_AVATAR_PROMPT_MIN_CHARS,
      promptMaxChars: MESHY_AVATAR_PROMPT_MAX_CHARS,
      costHintDe: 'Meshy nicht verfügbar.',
    };
  }
  return {
    meshyConfigured: Boolean(response.meshyConfigured),
    promptMinChars:
      typeof response.promptMinChars === 'number'
        ? response.promptMinChars
        : MESHY_AVATAR_PROMPT_MIN_CHARS,
    promptMaxChars:
      typeof response.promptMaxChars === 'number'
        ? response.promptMaxChars
        : MESHY_AVATAR_PROMPT_MAX_CHARS,
    costHintDe:
      typeof response.costHintDe === 'string'
        ? response.costHintDe
        : 'Externe KI (Meshy). Es entstehen Provider-Kosten.',
  };
}

export async function startMeshyAvatarJob(input: {
  prompt: string;
  clientNonce: string;
  characterId?: string | null;
}): Promise<MeshyAvatarJobSnapshot> {
  const validated = validateMeshyAvatarPrompt(input.prompt);
  if (!validated.ok) {
    throw new Error(validated.message ?? 'Prompt ungültig.');
  }
  const response = await invoke({
    action: 'start',
    prompt: validated.normalized,
    clientNonce: input.clientNonce,
    characterId: input.characterId ?? null,
  });
  if (response.status === 'not-configured') {
    return {
      jobId: '',
      status: 'provider-unavailable',
      progress: 0,
      prompt: validated.normalized,
      idempotencyKey: '',
      errorMessage: response.message,
      rigAnalysisStatus: 'pending',
    };
  }
  if (response.status !== 'ok' || !isRecord(response.job)) {
    throw new Error(response.status === 'error' ? response.message : 'Start fehlgeschlagen.');
  }
  return mapJob(response.job as Record<string, unknown>);
}

export async function pollMeshyAvatarJob(jobId: string): Promise<MeshyAvatarJobSnapshot> {
  const response = await invoke({ action: 'poll', jobId });
  if (response.status !== 'ok' || !isRecord(response.job)) {
    throw new Error(response.status === 'error' ? response.message : 'Poll fehlgeschlagen.');
  }
  const modelUrl = typeof response.modelUrl === 'string' ? response.modelUrl : undefined;
  return mapJob(response.job as Record<string, unknown>, modelUrl);
}

export async function retryMeshyAvatarJob(jobId: string): Promise<MeshyAvatarJobSnapshot> {
  const response = await invoke({ action: 'retry', jobId });
  if (response.status === 'not-configured') {
    return {
      jobId,
      status: 'provider-unavailable',
      progress: 0,
      prompt: '',
      idempotencyKey: '',
      errorMessage: response.message,
      rigAnalysisStatus: 'pending',
    };
  }
  if (response.status !== 'ok' || !isRecord(response.job)) {
    throw new Error(response.status === 'error' ? response.message : 'Retry fehlgeschlagen.');
  }
  const modelUrl = typeof response.modelUrl === 'string' ? response.modelUrl : undefined;
  return mapJob(response.job as Record<string, unknown>, modelUrl);
}
