/**
 * session-prepare-recap — Prepare/Recap lifecycle product contracts (#492).
 * Location: src/domains/session/contracts/session-prepare-recap.ts
 *
 * Pure domain: lifecycle labels, CTAs, audience-safe recap lines. No React or I/O.
 */

import type { SessionRole } from './live-session-access';
import type { ProjectSessionLifecycleStatus } from '../../resource-id/session-routing';
import { resolveNeutralSessionPhase } from '../../resource-id/session-routing';

export type SessionLifecycleScreen = 'prepare' | 'lobby' | 'live' | 'recap';

export type PrepareCtaKind = 'lobby' | 'invite' | 'live-resume' | 'back';

export type RecapCtaKind = 'next-session' | 'saga' | 'home';

export type SessionLifecycleSummary = {
  readonly sessionId: string;
  readonly sessionPublicId: string;
  readonly sagaPublicId: string;
  readonly sessionName: string;
  readonly sagaName: string | null;
  readonly statusLabelDe: string;
  readonly code: string;
  readonly playerCount: number;
  readonly startedAtIso: string | null;
  readonly endedAtIso: string | null;
};

export type RecapHighlightLine = {
  readonly id: string;
  readonly kind: string;
  readonly summary: string;
};

const STATUS_LABEL_DE: Record<string, string> = {
  scheduled: 'Geplant',
  waiting: 'Wartend',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
};

export function sessionStatusLabelDe(status: string): string {
  return STATUS_LABEL_DE[status] ?? status;
}

/**
 * Map persisted project-session status to the product lifecycle screen.
 * Extends #276: scheduled→prepare; active/paused→live; completed/cancelled→recap.
 * Unknown / waiting → prepare (safe pre-live default).
 */
export function resolveLifecycleScreenFromStatus(
  status: ProjectSessionLifecycleStatus | string,
): SessionLifecycleScreen {
  if (
    status === 'scheduled' ||
    status === 'active' ||
    status === 'paused' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return resolveNeutralSessionPhase(status);
  }
  return 'prepare';
}

export function buildPreparePrimaryCta(input: {
  readonly role: SessionRole;
  readonly status: string;
}): { readonly kind: PrepareCtaKind; readonly labelDe: string } {
  if (input.status === 'active' || input.status === 'paused') {
    return {
      kind: 'live-resume',
      labelDe: input.role === 'gamemaster' ? 'Live fortsetzen' : 'Zur Live-Session',
    };
  }
  if (input.role === 'gamemaster') {
    return { kind: 'lobby', labelDe: 'Zur Lobby' };
  }
  return { kind: 'lobby', labelDe: 'Lobby öffnen' };
}

export function buildRecapPrimaryCta(input: {
  readonly role: SessionRole;
}): { readonly kind: RecapCtaKind; readonly labelDe: string } {
  if (input.role === 'gamemaster') {
    return { kind: 'next-session', labelDe: 'Nächste Session erstellen' };
  }
  return { kind: 'saga', labelDe: 'Zur Saga' };
}

export function buildRecapHighlightLines(input: {
  readonly consequences: readonly { id: string; kind: string; summary: string }[];
  readonly emptyLabelDe?: string;
}): readonly RecapHighlightLine[] {
  if (input.consequences.length === 0) {
    return [
      {
        id: 'empty',
        kind: 'empty',
        summary: input.emptyLabelDe ?? 'Keine freigegebenen Ereignisse für deine Rolle.',
      },
    ];
  }
  return input.consequences.slice(0, 20).map((c) => ({
    id: c.id,
    kind: c.kind,
    summary: c.summary,
  }));
}

export function nextSessionDefaultName(baseName: string, sessionNumber: number): string {
  const trimmed = baseName.trim() || 'Session';
  const n = Number.isFinite(sessionNumber) && sessionNumber > 0 ? sessionNumber + 1 : 2;
  return `${trimmed} · Folge ${n}`;
}
