/**
 * AvatarMeshyPanel — "Mit KI erstellen" prompt flow for Meshy avatar generation (#10).
 * Location: src/app/character/avatar/AvatarMeshyPanel.tsx
 *
 * Confirms external cost before submit; reload-stable job id in sessionStorage;
 * explicit retry only (no auto paid retry). Capabilities stay pending for #6.
 */

import { useEffect, useRef, useState } from 'react';
import type { MeshyAvatarJobSnapshot, MeshyAvatarJobUiStatus } from '../../../domains/character/avatar/meshy-avatar-job';
import {
  fetchMeshyAvatarConfig,
  pollMeshyAvatarJob,
  retryMeshyAvatarJob,
  startMeshyAvatarJob,
  type MeshyAvatarConfig,
} from '../../../infrastructure/character/avatar/character-avatar-meshy-service';
import { Button } from '../../../shared/ui/button';
import { Textarea } from '../../../shared/ui/textarea';

const STORAGE_KEY = 'sagadrive:meshy-avatar-job';

interface AvatarMeshyPanelProps {
  characterId?: string | null;
  onSuccess: (modelUrl: string) => void;
}

const STATUS_LABEL: Record<MeshyAvatarJobUiStatus, string> = {
  idle: 'Bereit',
  confirming: 'Bitte bestätigen',
  queued: 'In Warteschlange …',
  generating: 'Generiert …',
  rigging: 'Übernimmt Modell …',
  analyzing: 'Rig-Analyse (#6) folgt',
  success: 'Fertig',
  failed: 'Fehlgeschlagen',
  'provider-unavailable': 'Provider nicht verfügbar',
};

function loadStoredJobId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeJobId(jobId: string | null): void {
  try {
    if (!jobId) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, jobId);
  } catch {
    // ignore
  }
}

export function AvatarMeshyPanel({ characterId, onSuccess }: AvatarMeshyPanelProps) {
  const [config, setConfig] = useState<MeshyAvatarConfig | null>(null);
  const [configReady, setConfigReady] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<MeshyAvatarJobSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConfigReady(false);
    void fetchMeshyAvatarConfig()
      .then((next) => {
        if (!cancelled) setConfig(next);
      })
      .finally(() => {
        if (!cancelled) setConfigReady(true);
      });
    const existing = loadStoredJobId();
    if (existing) {
      void pollMeshyAvatarJob(existing)
        .then((snapshot) => {
          setJob(snapshot);
          if (snapshot.status === 'success' && snapshot.modelUrl) {
            onSuccess(snapshot.modelUrl);
            storeJobId(null);
          }
        })
        .catch(() => storeJobId(null));
    }
    return () => {
      cancelled = true;
    };
  }, [onSuccess]);

  useEffect(() => {
    if (!job?.jobId) return;
    if (
      job.status === 'success' ||
      job.status === 'failed' ||
      job.status === 'provider-unavailable' ||
      job.status === 'idle'
    ) {
      return;
    }
    pollRef.current = window.setInterval(() => {
      void pollMeshyAvatarJob(job.jobId)
        .then((snapshot) => {
          setJob(snapshot);
          if (snapshot.status === 'success' && snapshot.modelUrl) {
            onSuccess(snapshot.modelUrl);
            storeJobId(null);
          }
          if (
            snapshot.status === 'failed' ||
            snapshot.status === 'provider-unavailable' ||
            snapshot.status === 'success'
          ) {
            if (pollRef.current) window.clearInterval(pollRef.current);
          }
        })
        .catch(() => {
          /* keep polling */
        });
    }, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [job?.jobId, job?.status, onSuccess]);

  const uiStatus: MeshyAvatarJobUiStatus = confirming
    ? 'confirming'
    : job?.status ?? 'idle';

  const promptMin = config?.promptMinChars ?? 8;
  const promptLen = prompt.trim().length;
  const promptTooShort = promptLen < promptMin;
  const meshyConfigured = configReady && Boolean(config?.meshyConfigured);
  const showNotConfigured = configReady && config?.meshyConfigured === false;

  const start = async () => {
    setBusy(true);
    try {
      const nonce = crypto.randomUUID();
      const snapshot = await startMeshyAvatarJob({
        prompt,
        clientNonce: nonce,
        characterId,
      });
      setJob(snapshot);
      setConfirming(false);
      if (snapshot.jobId) storeJobId(snapshot.jobId);
      if (snapshot.status === 'success' && snapshot.modelUrl) {
        onSuccess(snapshot.modelUrl);
        storeJobId(null);
      }
    } catch (error) {
      setJob({
        jobId: '',
        status: 'failed',
        progress: 0,
        prompt,
        idempotencyKey: '',
        errorMessage: error instanceof Error ? error.message : 'Start fehlgeschlagen.',
        rigAnalysisStatus: 'pending',
      });
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
      data-avatar-meshy-status={uiStatus}
      role="region"
      aria-label="Avatar mit KI erstellen"
    >
      <p className="font-medium">Mit KI erstellen</p>
      <p className="text-muted-foreground">
        {config?.costHintDe ??
          'Externe KI (Meshy). Es entstehen Provider-Kosten. Kein automatischer Paid-Retry.'}
      </p>
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="z. B. erwachsener Elfenkrieger, stilisierter Look …"
        rows={3}
        maxLength={config?.promptMaxChars ?? 500}
        disabled={busy || confirming || !configReady}
        aria-label="Meshy Prompt"
        data-avatar-meshy-prompt
      />
      <p className="text-muted-foreground" data-avatar-meshy-prompt-hint>
        Prompt mind. {promptMin} Zeichen
        {promptLen > 0 ? ` · ${promptLen}/${promptMin}` : ''}.
      </p>
      <div className="flex flex-wrap gap-2">
        {!confirming ? (
          <Button
            type="button"
            size="sm"
            disabled={busy || !configReady || !meshyConfigured || promptTooShort}
            data-avatar-meshy-start
            onClick={() => setConfirming(true)}
          >
            Mit KI erstellen
          </Button>
        ) : (
          <>
            <Button type="button" size="sm" disabled={busy} data-avatar-meshy-confirm onClick={() => void start()}>
              Kosten bestätigen & starten
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Abbrechen
            </Button>
          </>
        )}
        {(job?.status === 'failed' || job?.status === 'provider-unavailable') && job.jobId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            data-avatar-meshy-retry
            onClick={() => {
              setBusy(true);
              void retryMeshyAvatarJob(job.jobId)
                .then((snapshot) => {
                  setJob(snapshot);
                  if (snapshot.jobId) storeJobId(snapshot.jobId);
                })
                .finally(() => setBusy(false));
            }}
          >
            Erneut versuchen
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground" data-avatar-meshy-message role="status">
        {!configReady
          ? 'Prüfe Meshy-Konfiguration …'
          : `${STATUS_LABEL[uiStatus]}${job?.progress ? ` · ${job.progress}%` : ''}${
              job?.errorMessage ? ` — ${job.errorMessage}` : ''
            }`}
      </p>
      {showNotConfigured ? (
        <p
          className="text-amber-700 dark:text-amber-300"
          data-avatar-meshy-not-configured
        >
          Meshy nicht konfiguriert — bitte API-Key unter KI-Anbieter hinterlegen.
        </p>
      ) : null}
    </div>
  );
}
