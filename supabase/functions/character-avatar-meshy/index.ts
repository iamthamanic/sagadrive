/**
 * character-avatar-meshy Edge Function — prompt → Meshy text-to-3d → owner storage → #6 pending (#10).
 * MESHY key never leaves the server. Provider success does not set capabilities.
 * Location: supabase/functions/character-avatar-meshy/index.ts
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { downloadMeshyGlbBytes } from '../_shared/item-model3d-glb.ts';
import {
  isMeshyConfiguredForUser,
  resolveMeshyApiKeyForUser,
} from '../_shared/ai-provider-resolve-meshy.ts';
import {
  createLiveMeshyTextTo3dProvider,
  createMockMeshyTextTo3dProvider,
  mapMeshyTextTo3dStatusToJob,
  resolveMeshyTextTo3dConfig,
  type MeshyTextTo3dProvider,
} from '../_shared/avatar-meshy-text-to-3d.ts';
import { consumeAvatarMeshyRateLimit } from '../_shared/avatar-meshy-rate-limit.ts';

type JsonRecord = Record<string, unknown>;

const BUCKET = 'character-avatars';
const RATE_LIMIT = 2;
const RATE_WINDOW_SECONDS = 60;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 365;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getCorsHeaders(request: Request): HeadersInit {
  const configured = Deno.env.get('CHARACTER_AI_ALLOWED_ORIGIN')?.trim() || '';
  const requestOrigin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (configured === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (configured && requestOrigin === configured) {
    headers['Access-Control-Allow-Origin'] = configured;
  } else if (requestOrigin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  } else {
    headers['Access-Control-Allow-Origin'] = configured || '*';
  }
  return headers;
}

function json(status: number, body: JsonRecord, request: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(request),
  });
}

function validatePrompt(prompt: unknown): { ok: true; prompt: string } | { ok: false; message: string } {
  if (typeof prompt !== 'string') return { ok: false, message: 'Prompt fehlt.' };
  const normalized = prompt.trim().replace(/\s+/g, ' ');
  if (normalized.length < 8) return { ok: false, message: 'Prompt zu kurz (min. 8 Zeichen).' };
  if (normalized.length > 500) return { ok: false, message: 'Prompt zu lang (max. 500 Zeichen).' };
  return { ok: true, prompt: normalized };
}

async function getUserId(request: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: anonKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  if (!isRecord(body) || typeof body.id !== 'string') return null;
  return body.id;
}

function resolveProvider(apiKey: string | null): MeshyTextTo3dProvider | null {
  if (Deno.env.get('MESHY_AVATAR_USE_MOCK') === '1') {
    return createMockMeshyTextTo3dProvider();
  }
  const config = resolveMeshyTextTo3dConfig(Deno.env, apiKey);
  if (!config) return null;
  return createLiveMeshyTextTo3dProvider(config);
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }
  if (request.method !== 'POST') {
    return json(405, { status: 'error', message: 'Nur POST erlaubt.' }, request);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() ?? '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { status: 'error', message: 'Server-Konfiguration unvollständig.' }, request);
  }

  const userId = await getUserId(request, supabaseUrl, anonKey);
  if (!userId) {
    return json(401, { status: 'error', message: 'Anmeldung erforderlich.' }, request);
  }

  let payload: JsonRecord;
  try {
    const raw: unknown = await request.json();
    if (!isRecord(raw)) throw new Error('invalid');
    payload = raw;
  } catch {
    return json(400, { status: 'error', message: 'Ungültiger JSON-Body.' }, request);
  }

  const action = typeof payload.action === 'string' ? payload.action : '';
  const serviceHeaders = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  if (action === 'config') {
    const configured = await isMeshyConfiguredForUser(userId, {
      url: supabaseUrl,
      serviceRoleKey,
    });
    return json(200, {
      status: 'ok',
      meshyConfigured: configured || Deno.env.get('MESHY_AVATAR_USE_MOCK') === '1',
      promptMinChars: 8,
      promptMaxChars: 500,
      costHintDe:
        'Externe KI (Meshy). Es entstehen Provider-Kosten. Kein automatischer Paid-Retry bei Fehlern.',
    }, request);
  }

  if (action === 'start') {
    const promptCheck = validatePrompt(payload.prompt);
    if (!promptCheck.ok) {
      return json(400, { status: 'error', message: promptCheck.message }, request);
    }
    const clientNonce = typeof payload.clientNonce === 'string' ? payload.clientNonce.trim() : '';
    if (!clientNonce || clientNonce.length > 80) {
      return json(400, { status: 'error', message: 'clientNonce fehlt oder ist ungültig.' }, request);
    }
    const characterId = typeof payload.characterId === 'string' ? payload.characterId : null;
    const idempotencyKey = `${userId}|${clientNonce}|${promptCheck.prompt.length}`;

    const rate = consumeAvatarMeshyRateLimit({
      userId,
      limit: RATE_LIMIT,
      windowSeconds: RATE_WINDOW_SECONDS,
    });
    if (!rate.ok) {
      return json(429, {
        status: 'error',
        code: 'rate_limited',
        message: `Zu viele Anfragen. Bitte in ${rate.retryAfterSeconds}s erneut versuchen.`,
      }, request);
    }

    const apiKey = await resolveMeshyApiKeyForUser(userId, {
      url: supabaseUrl,
      serviceRoleKey,
    });
    const provider = resolveProvider(apiKey);
    if (!provider) {
      return json(200, {
        status: 'not-configured',
        message: 'Meshy ist nicht konfiguriert. Bitte API-Key unter KI-Anbieter hinterlegen.',
      }, request);
    }

    // Idempotent replay
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?owner_user_id=eq.${encodeURIComponent(userId)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`,
      { headers: { ...serviceHeaders, Prefer: 'return=representation' } },
    );
    if (existingRes.ok) {
      const rows: unknown = await existingRes.json();
      if (Array.isArray(rows) && rows.length > 0 && isRecord(rows[0])) {
        return json(200, { status: 'ok', job: rows[0], replayed: true }, request);
      }
    }

    let providerTaskId: string;
    try {
      const created = await provider.createTask(promptCheck.prompt);
      providerTaskId = created.taskId;
    } catch (error) {
      console.error('meshy avatar create failed', error instanceof Error ? error.message : 'unknown');
      return json(200, {
        status: 'ok',
        job: {
          id: null,
          status: 'provider_unavailable',
          progress: 0,
          prompt: promptCheck.prompt,
          error_message: 'Meshy derzeit nicht erreichbar.',
          rig_analysis_status: 'pending',
        },
      }, request);
    }

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/character_avatar_meshy_jobs`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        owner_user_id: userId,
        character_id: characterId,
        prompt: promptCheck.prompt,
        idempotency_key: idempotencyKey,
        status: 'generating',
        progress: 5,
        provider_task_id: providerTaskId,
        rig_analysis_status: 'pending',
      }),
    });
    if (!insertRes.ok) {
      const detail = await insertRes.text();
      console.error('meshy job insert failed', detail);
      return json(500, { status: 'error', message: 'Job konnte nicht gespeichert werden.' }, request);
    }
    const inserted: unknown = await insertRes.json();
    const job = Array.isArray(inserted) ? inserted[0] : inserted;
    return json(200, { status: 'ok', job }, request);
  }

  if (action === 'poll' || action === 'retry') {
    const jobId = typeof payload.jobId === 'string' ? payload.jobId : '';
    if (!jobId) return json(400, { status: 'error', message: 'jobId fehlt.' }, request);

    const jobRes = await fetch(
      `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}&owner_user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
      { headers: serviceHeaders },
    );
    if (!jobRes.ok) {
      return json(500, { status: 'error', message: 'Job konnte nicht geladen werden.' }, request);
    }
    const jobs: unknown = await jobRes.json();
    if (!Array.isArray(jobs) || jobs.length === 0 || !isRecord(jobs[0])) {
      return json(404, { status: 'error', message: 'Job nicht gefunden.' }, request);
    }
    const job = jobs[0];

    if (action === 'retry') {
      if (job.status !== 'failed' && job.status !== 'provider_unavailable') {
        return json(400, { status: 'error', message: 'Retry nur nach Fehler.' }, request);
      }
      // Explicit retry only — never auto paid retry. New provider task, same prompt.
      const apiKey = await resolveMeshyApiKeyForUser(userId, { url: supabaseUrl, serviceRoleKey });
      const provider = resolveProvider(apiKey);
      if (!provider) {
        return json(200, {
          status: 'not-configured',
          message: 'Meshy ist nicht konfiguriert.',
        }, request);
      }
      try {
        const created = await provider.createTask(String(job.prompt ?? ''));
        await fetch(
          `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({
              status: 'generating',
              progress: 5,
              provider_task_id: created.taskId,
              error_message: null,
              updated_at: new Date().toISOString(),
            }),
          },
        );
      } catch {
        return json(200, {
          status: 'ok',
          job: { ...job, status: 'provider_unavailable', error_message: 'Meshy nicht erreichbar.' },
        }, request);
      }
    }

    // Refresh job after possible retry
    const refreshedRes = await fetch(
      `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}&owner_user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
      { headers: serviceHeaders },
    );
    const refreshedJobs: unknown = await refreshedRes.json();
    const current = Array.isArray(refreshedJobs) && isRecord(refreshedJobs[0])
      ? refreshedJobs[0]
      : job;

    if (current.status === 'succeeded' && typeof current.storage_path === 'string') {
      const signed = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/${BUCKET}/${current.storage_path}`,
        {
          method: 'POST',
          headers: serviceHeaders,
          body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
        },
      );
      let modelUrl: string | undefined;
      if (signed.ok) {
        const signedBody: unknown = await signed.json();
        if (isRecord(signedBody) && typeof signedBody.signedURL === 'string') {
          modelUrl = `${supabaseUrl}/storage/v1${signedBody.signedURL}`;
        }
      }
      return json(200, {
        status: 'ok',
        job: current,
        modelUrl,
        // Explicit: still pending until client/runtime runs #6
        rigAnalysisStatus: 'pending',
      }, request);
    }

    if (
      current.status === 'failed' ||
      current.status === 'provider_unavailable' ||
      current.status === 'canceled'
    ) {
      return json(200, { status: 'ok', job: current }, request);
    }

    const apiKey = await resolveMeshyApiKeyForUser(userId, { url: supabaseUrl, serviceRoleKey });
    const provider = resolveProvider(apiKey);
    if (!provider || typeof current.provider_task_id !== 'string') {
      return json(200, {
        status: 'ok',
        job: { ...current, status: 'provider_unavailable' },
      }, request);
    }

    try {
      const task = await provider.getTask(current.provider_task_id);
      const mapped = mapMeshyTextTo3dStatusToJob(task.status);
      if (mapped === 'generating') {
        await fetch(
          `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({
              status: 'generating',
              progress: Math.max(5, task.progress),
              updated_at: new Date().toISOString(),
            }),
          },
        );
        return json(200, {
          status: 'ok',
          job: { ...current, status: 'generating', progress: Math.max(5, task.progress) },
        }, request);
      }
      if (mapped === 'failed') {
        await fetch(
          `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({
              status: 'failed',
              error_message: task.task_error?.message ?? 'Meshy-Generierung fehlgeschlagen.',
              updated_at: new Date().toISOString(),
            }),
          },
        );
        return json(200, {
          status: 'ok',
          job: {
            ...current,
            status: 'failed',
            error_message: task.task_error?.message ?? 'Meshy-Generierung fehlgeschlagen.',
          },
        }, request);
      }

      const glbUrl = task.model_urls?.glb;
      if (!glbUrl) {
        await fetch(
          `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({
              status: 'failed',
              error_message: 'Meshy lieferte keine Modell-URL.',
              updated_at: new Date().toISOString(),
            }),
          },
        );
        return json(200, {
          status: 'ok',
          job: { ...current, status: 'failed', error_message: 'Meshy lieferte keine Modell-URL.' },
        }, request);
      }

      // Materialize into owner-scoped storage (SSRF-safe download).
      await fetch(
        `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}`,
        {
          method: 'PATCH',
          headers: serviceHeaders,
          body: JSON.stringify({
            status: 'rigging',
            progress: 90,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      const downloaded = await downloadMeshyGlbBytes(glbUrl);
      const artifactId = crypto.randomUUID();
      const storagePath = `${userId}/meshy/${artifactId}.glb`;
      // Deno fetch body: copy Uint8Array / Blob (lesson from #140)
      const payload = new Uint8Array(downloaded.bytes.byteLength);
      payload.set(downloaded.bytes);
      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            'Content-Type': 'model/gltf-binary',
            'x-upsert': 'false',
          },
          body: new Blob([payload]),
        },
      );
      if (!uploadRes.ok) {
        const detail = await uploadRes.text();
        console.error('meshy avatar upload failed', detail);
        await fetch(
          `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({
              status: 'failed',
              error_message: 'Speichern des Modells fehlgeschlagen.',
              updated_at: new Date().toISOString(),
            }),
          },
        );
        return json(200, {
          status: 'ok',
          job: { ...current, status: 'failed', error_message: 'Speichern des Modells fehlgeschlagen.' },
        }, request);
      }

      // analyzing = handoff to #6 — still pending capabilities
      await fetch(
        `${supabaseUrl}/rest/v1/character_avatar_meshy_jobs?id=eq.${encodeURIComponent(jobId)}`,
        {
          method: 'PATCH',
          headers: serviceHeaders,
          body: JSON.stringify({
            status: 'succeeded',
            progress: 100,
            storage_path: storagePath,
            rig_analysis_status: 'pending',
            updated_at: new Date().toISOString(),
          }),
        },
      );

      const signed = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/${BUCKET}/${storagePath}`,
        {
          method: 'POST',
          headers: serviceHeaders,
          body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
        },
      );
      let modelUrl: string | undefined;
      if (signed.ok) {
        const signedBody: unknown = await signed.json();
        if (isRecord(signedBody) && typeof signedBody.signedURL === 'string') {
          modelUrl = `${supabaseUrl}/storage/v1${signedBody.signedURL}`;
        }
      }

      return json(200, {
        status: 'ok',
        job: {
          ...current,
          status: 'succeeded',
          progress: 100,
          storage_path: storagePath,
          rig_analysis_status: 'pending',
        },
        modelUrl,
        rigAnalysisStatus: 'pending',
      }, request);
    } catch (error) {
      console.error('meshy avatar poll failed', error instanceof Error ? error.message : 'unknown');
      return json(200, {
        status: 'ok',
        job: {
          ...current,
          status: 'provider_unavailable',
          error_message: 'Meshy-Status konnte nicht geladen werden.',
        },
      }, request);
    }
  }

  return json(400, { status: 'error', message: 'Unbekannte action.' }, request);
});
