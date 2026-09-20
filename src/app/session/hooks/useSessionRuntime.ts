/**
 * useSessionRuntime — Reconnect-safe SessionRuntimeState hook (snapshot then realtime).
 * Location: src/app/session/hooks/useSessionRuntime.ts
 */
import { useEffect, useRef, useState } from 'react';
import type { SessionRuntimeState } from '../../../domains/session/contracts/session-runtime';
import {
  subscribeSessionRuntime,
  type SessionRuntimeSubscription,
} from '../../../infrastructure/session/session-runtime-channel';
import { sessionRuntimeService } from '../../../infrastructure/session/session-runtime-service';
import type { SessionEventKind } from '../../../domains/session/contracts/session-runtime';
import { StaleRuntimeRevisionError } from '../../../domains/session/contracts/session-runtime';

export interface UseSessionRuntimeResult {
  state: SessionRuntimeState | null;
  isLoading: boolean;
  error: string | null;
  /** Force snapshot + keep subscription (manual reconnect). */
  resync: () => Promise<void>;
  applyCommand: (input: {
    kind: SessionEventKind | string;
    payload?: Record<string, unknown>;
    idempotencyKey?: string | null;
  }) => Promise<SessionRuntimeState | null>;
}

/**
 * Subscribe protocol: snapshot → realtime. On visibility restore or error, resync snapshot.
 */
export function useSessionRuntime(sessionId: string | null): UseSessionRuntimeResult {
  const [state, setState] = useState<SessionRuntimeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<SessionRuntimeSubscription | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const connect = async () => {
      try {
        const sub = await subscribeSessionRuntime(sessionId, (next) => {
          if (!cancelled) setState(next);
        });
        if (cancelled) {
          await sub.unsubscribe();
          return;
        }
        subRef.current = sub;
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Runtime-Subscribe fehlgeschlagen');
          setIsLoading(false);
        }
      }
    };

    void connect();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && subRef.current) {
        void subRef.current.resync().catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Resync fehlgeschlagen');
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      const sub = subRef.current;
      subRef.current = null;
      if (sub) void sub.unsubscribe();
    };
  }, [sessionId]);

  const resync = async () => {
    if (!subRef.current) return;
    try {
      setError(null);
      await subRef.current.resync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resync fehlgeschlagen');
    }
  };

  const applyCommand = async (input: {
    kind: SessionEventKind | string;
    payload?: Record<string, unknown>;
    idempotencyKey?: string | null;
  }): Promise<SessionRuntimeState | null> => {
    if (!sessionId || !state) return null;
    try {
      setError(null);
      const next = await sessionRuntimeService.applyCommand({
        sessionId,
        expectedRevision: state.revision,
        kind: input.kind,
        payload: input.payload,
        idempotencyKey: input.idempotencyKey,
      });
      setState(next);
      return next;
    } catch (err) {
      if (err instanceof StaleRuntimeRevisionError) {
        setError(err.message);
        await resync();
        return null;
      }
      setError(err instanceof Error ? err.message : 'Befehl fehlgeschlagen');
      return null;
    }
  };

  return { state, isLoading, error, resync, applyCommand };
}
