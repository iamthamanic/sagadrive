/**
 * SagaResourceScreen — foundation shell for /sagas/** resource routes (#276).
 * Location: src/app/project/SagaResourceScreen.tsx
 *
 * Deep-linkable Saga sections; full redesign is out of scope for this issue.
 * #302: overview + sessions link to SessionJoin (mounted in App) — no session import (cycle).
 */
import { Button } from '../../shared/ui/button';
import { pathForView, type SagaSectionId } from '../shell';

type SagaResourceScreenProps = {
  mode: 'list' | 'new' | 'section';
  sagaPublicId?: string | null;
  section?: SagaSectionId;
  onNavigateHome: () => void;
  onNavigate?: (view: string) => void;
};

const SECTION_LABELS: Record<SagaSectionId, string> = {
  overview: 'Übersicht',
  characters: 'Charaktere',
  world: 'Welt',
  'npc-creatures': 'NSCs / Kreaturen',
  items: 'Gegenstände',
  quests: 'Quests',
  sessions: 'Sessions',
  settings: 'Einstellungen',
};

export function SagaResourceScreen({
  mode,
  sagaPublicId,
  section = 'overview',
  onNavigateHome,
  onNavigate,
}: SagaResourceScreenProps) {
  const goSessionJoin = () => {
    if (onNavigate) {
      onNavigate('session-join');
      return;
    }
    const path = pathForView('session-join');
    if (path && typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (mode === 'list') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Sagas</h1>
        <p className="text-sm text-muted-foreground">
          Stabile Saga-URLs nutzen öffentliche IDs im Format SA-XXXXX. Interne UUIDs
          und Join-Codes bleiben unverändert.
        </p>
        <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
          Zurück zum Dashboard
        </Button>
        <p className="text-xs text-muted-foreground">
          Öffne eine Saga über Deep Link, z. B.
          {' '}
          <code className="rounded bg-muted px-1">/sagas/SA-K7M4Q</code>
          .
        </p>
      </div>
    );
  }

  if (mode === 'new') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Neue Saga</h1>
        <p className="text-sm text-muted-foreground">
          Neue Sagas erhalten serverseitig eine unveränderliche Public ID (SA-XXXXX).
        </p>
        <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
          Abbrechen
        </Button>
      </div>
    );
  }

  if (section === 'sessions') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Saga</p>
        <h1 className="text-2xl font-semibold text-foreground">
          {sagaPublicId ?? 'Unbekannte Saga'}
          {' '}
          · Sessions
        </h1>
        <p className="text-sm text-muted-foreground">
          Starte oder betrete eine Spielsession über die normale Session-UI. Player-Test-Abenteuer
          vorbereiten und Pregens findest du dort ebenfalls.
        </p>
        <Button type="button" onClick={goSessionJoin} data-saga-sessions-join>
          Session starten / beitreten
        </Button>
        <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
          Zurück
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Saga</p>
      <h1 className="text-2xl font-semibold text-foreground">
        {sagaPublicId ?? 'Unbekannte Saga'}
      </h1>
      <p className="text-sm text-muted-foreground">
        Bereich:
        {' '}
        <strong>{SECTION_LABELS[section]}</strong>
        . Reload und Deep Links stellen denselben Kontext wieder her. Berechtigungen
        kommen aus Membership/RLS — nicht aus der URL.
      </p>
      {section === 'overview' ? (
        <Button type="button" onClick={goSessionJoin} data-saga-session-start>
          Session starten
        </Button>
      ) : null}
      <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
        Zurück
      </Button>
    </div>
  );
}
